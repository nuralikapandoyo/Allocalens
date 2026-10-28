// Aturan validasi data employee dan task (FR-05, NFR-14, NFR-15).
const ENUMS = {
  education_level: ['Diploma', 'Bachelor', 'Master', 'PhD'],
  department: ['Finance', 'HR', 'IT', 'Marketing', 'Operations', 'R&D'],
  skill_level: ['Low', 'Medium', 'High', 'Expert'],
  performance_rating: ['Poor', 'Average', 'Good', 'Excellent'],
  task_complexity: ['Low', 'Medium', 'High'],
  required_skill_level: ['Low', 'Medium', 'High', 'Expert'],
  task_priority: ['Low', 'Medium', 'High', 'Critical'],
};

const int = (field, min, max) => ({ field, type: 'int', min, max });
const oneOf = (field) => ({ field, type: 'enum', values: ENUMS[field] });

const EMPLOYEE_RULES = [
  int('age', 17, 70),
  int('experience_years', 0, 50),
  oneOf('education_level'),
  oneOf('department'),
  oneOf('skill_level'),
  int('technical_skill_score', 0, 100),
  int('communication_score', 0, 100),
  int('leadership_score', 0, 100),
  int('problem_solving_score', 0, 100),
  int('attendance_rate', 0, 100),
  oneOf('performance_rating'),
  int('idle_time_hours', 0, 168),
  int('conflict_rate', 0, 100),
  int('previous_task_success_rate', 0, 100),
];

const TASK_RULES = [
  oneOf('task_complexity'),
  oneOf('required_skill_level'),
  int('deadline_days', 1, 365),
  int('workload_hours', 1, 168),
  oneOf('task_priority'),
  int('team_size', 1, 100),
];

function isEmpty(v) {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '');
}

// Mengembalikan daftar error [{ field, message }]. Kosong = data valid.
function validate(row, rules) {
  const errors = [];
  for (const rule of rules) {
    const value = row ? row[rule.field] : undefined;
    if (isEmpty(value)) {
      errors.push({ field: rule.field, message: `${rule.field} wajib diisi.` });
      continue;
    }
    if (rule.type === 'int') {
      const n = typeof value === 'number' ? value : Number(value);
      if (!Number.isInteger(n)) {
        errors.push({ field: rule.field, message: `${rule.field} harus berupa angka bulat.` });
      } else if (n < rule.min || n > rule.max) {
        errors.push({ field: rule.field, message: `${rule.field} harus antara ${rule.min} dan ${rule.max}.` });
      }
    } else if (rule.type === 'enum' && !rule.values.includes(value)) {
      errors.push({ field: rule.field, message: `${rule.field} harus salah satu dari: ${rule.values.join(', ')}.` });
    }
  }
  return errors;
}

const validateEmployee = (row) => {
  const errors = validate(row, EMPLOYEE_RULES);
  if (Number.isInteger(row.experience_years) && Number.isInteger(row.age) && row.experience_years > row.age) {
    errors.push({ field: 'experience_years', message: 'experience_years tidak boleh lebih besar dari age.' });
  }
  return errors;
};
const validateTask = (row) => validate(row, TASK_RULES);

// Validasi teks task (nama & deskripsi). Dipisah dari TASK_RULES karena 5.000 task dari dataset
// tidak punya nama, jadi nama hanya wajib saat PM membuat task baru.
const TEXT_LIMITS = { task_name: 150, description: 2000 };

function validateTaskText(row, { requireName = false } = {}) {
  const errors = [];
  const name = row ? row.task_name : undefined;
  if (name === undefined || name === null) {
    if (requireName) errors.push({ field: 'task_name', message: 'task_name wajib diisi.' });
  } else if (typeof name !== 'string' || name.trim() === '') {
    errors.push({ field: 'task_name', message: 'task_name tidak boleh kosong.' });
  } else if (name.length > TEXT_LIMITS.task_name) {
    errors.push({ field: 'task_name', message: `task_name maksimal ${TEXT_LIMITS.task_name} karakter.` });
  }

  const desc = row ? row.description : undefined;
  if (desc !== undefined && desc !== null) {
    if (typeof desc !== 'string') {
      errors.push({ field: 'description', message: 'description harus berupa teks.' });
    } else if (desc.length > TEXT_LIMITS.description) {
      errors.push({ field: 'description', message: `description maksimal ${TEXT_LIMITS.description} karakter.` });
    }
  }
  return errors;
}

module.exports = { ENUMS, EMPLOYEE_RULES, TASK_RULES, validate, validateEmployee, validateTask, validateTaskText };