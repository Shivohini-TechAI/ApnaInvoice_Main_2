# Database Structure Documentation

## Database Technology

* Database: PostgreSQL
* Backend: Node.js + Express.js
* Authentication: JWT
* Connection Method: PostgreSQL Pool Connection

---

# Table: user_profiles

## Purpose

Stores all registered users and role information.

| Column Name  | Description            |
| ------------ | ---------------------- |
| id           | Unique User ID         |
| name         | User Full Name         |
| email        | User Email             |
| password     | Encrypted Password     |
| phone        | Phone Number           |
| whatsapp     | WhatsApp Number        |
| strong_areas | Skills/Strong Areas    |
| role         | User Role              |
| designation  | User Designation       |
| company_name | Company Name           |
| created_at   | Creation Timestamp     |
| updated_at   | Last Updated Timestamp |

---

# Table: signup_codes

## Purpose

Stores registration codes used during user signup.

| Column Name  |
| ------------ |
| id           |
| code         |
| role         |
| is_active    |
| max_uses     |
| current_uses |
| expires_at   |

---

# Table: projects

## Purpose

Stores all project information.

| Column Name      |
| ---------------- |
| id               |
| title            |
| description      |
| user_requirement |
| status           |
| github_url       |
| deployment_link  |
| created_by       |
| assigned_members |
| end_date         |
| created_at       |
| updated_at       |

---

# Table: project_tasks

## Purpose

Stores tasks assigned inside projects.

| Column Name |
| ----------- |
| id          |
| project_id  |
| title       |
| assigned_to |
| due_date    |
| completed   |
| created_at  |

---

# Table: meeting_notes

## Purpose

Stores project meeting discussions.

| Column Name |
| ----------- |
| id          |
| project_id  |
| title       |
| content     |
| created_at  |

---

# Table: progress_steps

## Purpose

Tracks project progress milestones.

| Column Name |
| ----------- |
| id          |
| project_id  |
| step_name   |
| status      |
| created_at  |

---

# Table: costing_items

## Purpose

Stores project costing and scaling information.

| Column Name |
| ----------- |
| id          |
| project_id  |
| item_name   |
| amount      |
| description |

---

# Table: client_payments

## Purpose

Stores payment information.

| Column Name  |
| ------------ |
| id           |
| project_id   |
| amount       |
| payment_date |
| remarks      |

---

# Table: clients

## Purpose

CRM client management.

| Column Name |
| ----------- |
| id          |
| name        |
| email       |
| phone       |
| stage       |
| created_at  |

---

# Table: client_stage_notes

## Purpose

Stores client stage updates and follow-up notes.

| Column Name |
| ----------- |
| id          |
| client_id   |
| note        |
| stage       |
| created_at  |

---

# Table: personal_todos

## Purpose

Stores personal to-do tasks for users.

| Column Name |
| ----------- |
| id          |
| user_id     |
| title       |
| completed   |
| due_date    |
| created_at  |

---

# Database Relationships

User
├── Projects
│ ├── Tasks
│ ├── Meeting Notes
│ ├── Progress Steps
│ ├── Costing Items
│ └── Payments
│
├── Personal Todos
│
└── CRM Clients
└── Client Stage Notes

---

# Security Features

* JWT Authentication
* Password Hashing using bcrypt
* Role Based Access Control
* Protected API Routes
* Admin Only Operations

---

# Roles

* Admin
* Project Manager
* Team Leader
* Team Member
* User

Each role has different access permissions throughout the system.

---

# Conclusion

The database is designed to support project management, CRM operations, team collaboration, analytics, task tracking, and user management while maintaining security and scalability.
