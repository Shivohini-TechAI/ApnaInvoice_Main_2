const express = require("express");
const pool = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        i.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', li.id,
              'name', li.name,
              'description', li.description,
              'qty', li.qty,
              'unit_price', li.unit_price,
              'line_total', li.line_total
            )
          ) FILTER (WHERE li.id IS NOT NULL),
          '[]'
        ) AS line_items
       FROM invoices i
       LEFT JOIN invoice_line_items li ON i.id = li.invoice_id
       GROUP BY i.id
       ORDER BY i.created_at DESC`
    );

    res.status(200).json({
      success: true,
      invoices: result.rows,
    });
  } catch (error) {
    console.error("Fetch invoices error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoices",
      error: error.message,
    });
  }
});
router.post("/:id/pdf", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { file_name } = req.body;

    if (!file_name) {
      return res.status(400).json({
        success: false,
        message: "PDF file name is required",
      });
    }

    const result = await pool.query(
      `INSERT INTO invoice_pdfs
       (invoice_id, file_name, created_by)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [id, file_name, req.user.id]
    );

    res.status(201).json({
      success: true,
      message: "PDF metadata saved successfully",
      pdf: result.rows[0],
    });
  } catch (error) {
    console.error("Save PDF metadata error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to save PDF metadata",
      error: error.message,
    });
  }
});

router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const invoiceResult = await pool.query(
      "SELECT * FROM invoices WHERE id = $1",
      [id]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    const itemsResult = await pool.query(
      "SELECT * FROM invoice_line_items WHERE invoice_id = $1 ORDER BY created_at ASC",
      [id]
    );

    res.status(200).json({
      success: true,
      invoice: {
        ...invoiceResult.rows[0],
        line_items: itemsResult.rows,
      },
    });
  } catch (error) {
    console.error("Fetch invoice error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch invoice",
      error: error.message,
    });
  }
});

router.post("/", authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      number,
      issue_date,
      due_date,
      currency,
      bill_from_company,
      bill_from_email,
      bill_from_phone,
      bill_from_address,
      bill_to_name,
      bill_to_email,
      bill_to_phone,
      bill_to_address,
      tax_rate,
      discount_type,
      discount_value,
      subtotal,
      tax_amount,
      discount_amount,
      total_due,
      include_notes,
      notes,
      include_terms,
      terms,
      include_signature,
      signature_url,
      line_items,
    } = req.body;

    if (!number || !issue_date || !due_date || !currency) {
      return res.status(400).json({
        success: false,
        message: "Invoice number, issue date, due date and currency are required",
      });
    }

    await client.query("BEGIN");

    const invoiceResult = await client.query(
      `INSERT INTO invoices (
        number,
        issue_date,
        due_date,
        currency,
        bill_from_company,
        bill_from_email,
        bill_from_phone,
        bill_from_address,
        bill_to_name,
        bill_to_email,
        bill_to_phone,
        bill_to_address,
        tax_rate,
        discount_type,
        discount_value,
        subtotal,
        tax_amount,
        discount_amount,
        total_due,
        include_notes,
        notes,
        include_terms,
        terms,
        include_signature,
        signature_url,
        created_by
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26
      )
      RETURNING *`,
      [
        number,
        issue_date,
        due_date,
        currency,
        bill_from_company || null,
        bill_from_email || null,
        bill_from_phone || null,
        bill_from_address || null,
        bill_to_name || null,
        bill_to_email || null,
        bill_to_phone || null,
        bill_to_address || null,
        tax_rate || 0,
        discount_type || "flat",
        discount_value || 0,
        subtotal || 0,
        tax_amount || 0,
        discount_amount || 0,
        total_due || 0,
        include_notes !== undefined ? include_notes : true,
        notes || null,
        include_terms !== undefined ? include_terms : true,
        terms || null,
        include_signature !== undefined ? include_signature : true,
        signature_url || null,
        req.user.id,
      ]
    );

    const invoice = invoiceResult.rows[0];
    const insertedItems = [];

    if (Array.isArray(line_items) && line_items.length > 0) {
      for (const item of line_items) {
        const itemResult = await client.query(
          `INSERT INTO invoice_line_items (
            invoice_id,
            name,
            description,
            qty,
            unit_price,
            line_total
          )
          VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING *`,
          [
            invoice.id,
            item.name,
            item.description || null,
            item.qty || 0,
            item.unit_price || 0,
            item.line_total || 0,
          ]
        );

        insertedItems.push(itemResult.rows[0]);
      }
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: "Invoice created successfully",
      invoice: {
        ...invoice,
        line_items: insertedItems,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Create invoice error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to create invoice",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;

    const {
      number,
      issue_date,
      due_date,
      currency,
      bill_from_company,
      bill_from_email,
      bill_from_phone,
      bill_from_address,
      bill_to_name,
      bill_to_email,
      bill_to_phone,
      bill_to_address,
      tax_rate,
      discount_type,
      discount_value,
      subtotal,
      tax_amount,
      discount_amount,
      total_due,
      include_notes,
      notes,
      include_terms,
      terms,
      include_signature,
      signature_url,
      line_items,
    } = req.body;

    await client.query("BEGIN");

    const invoiceResult = await client.query(
      `UPDATE invoices
       SET number = $1,
           issue_date = $2,
           due_date = $3,
           currency = $4,
           bill_from_company = $5,
           bill_from_email = $6,
           bill_from_phone = $7,
           bill_from_address = $8,
           bill_to_name = $9,
           bill_to_email = $10,
           bill_to_phone = $11,
           bill_to_address = $12,
           tax_rate = $13,
           discount_type = $14,
           discount_value = $15,
           subtotal = $16,
           tax_amount = $17,
           discount_amount = $18,
           total_due = $19,
           include_notes = $20,
           notes = $21,
           include_terms = $22,
           terms = $23,
           include_signature = $24,
           signature_url = $25
       WHERE id = $26
       RETURNING *`,
      [
        number,
        issue_date,
        due_date,
        currency,
        bill_from_company || null,
        bill_from_email || null,
        bill_from_phone || null,
        bill_from_address || null,
        bill_to_name || null,
        bill_to_email || null,
        bill_to_phone || null,
        bill_to_address || null,
        tax_rate || 0,
        discount_type || "flat",
        discount_value || 0,
        subtotal || 0,
        tax_amount || 0,
        discount_amount || 0,
        total_due || 0,
        include_notes !== undefined ? include_notes : true,
        notes || null,
        include_terms !== undefined ? include_terms : true,
        terms || null,
        include_signature !== undefined ? include_signature : true,
        signature_url || null,
        id,
      ]
    );

    if (invoiceResult.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    await client.query("DELETE FROM invoice_line_items WHERE invoice_id = $1", [
      id,
    ]);

    const insertedItems = [];

    if (Array.isArray(line_items) && line_items.length > 0) {
      for (const item of line_items) {
        const itemResult = await client.query(
          `INSERT INTO invoice_line_items (
            invoice_id,
            name,
            description,
            qty,
            unit_price,
            line_total
          )
          VALUES ($1,$2,$3,$4,$5,$6)
          RETURNING *`,
          [
            id,
            item.name,
            item.description || null,
            item.qty || 0,
            item.unit_price || 0,
            item.line_total || 0,
          ]
        );

        insertedItems.push(itemResult.rows[0]);
      }
    }

    await client.query("COMMIT");

    res.status(200).json({
      success: true,
      message: "Invoice updated successfully",
      invoice: {
        ...invoiceResult.rows[0],
        line_items: insertedItems,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Update invoice error:", error.message);

    res.status(500).json({
      success: false,
      message: "Failed to update invoice",
      error: error.message,
    });
  } finally {
    client.release();
  }
});

router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "DELETE FROM invoices WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Invoice deleted successfully",
    });
  } catch (error) {
    console.error("Delete invoice error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to delete invoice",
      error: error.message,
    });
  }
});

module.exports = router;