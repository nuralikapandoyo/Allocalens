// SEMUA keputusan skoring ada di file ini. Isinya masih USULAN SEMENTARA dari draf SA
// (Allocalens_Scoring_Evaluation_Draft.docx) dan belum disetujui PO/stakeholder.
// Setelah tim sepakat, cukup ubah angka di sini, kode lain tidak perlu diubah (NFR-24).

module.exports = {
  // Skala level skill (dipakai untuk skill_level employee dan required_skill_level task).
  SKILL_SCALE: { Low: 1, Medium: 2, High: 3, Expert: 4 },

  // Bobot candidate score. Totalnya harus 1.
  WEIGHTS: { skill: 0.4, workload: 0.3, deadline: 0.3 },

  // Ambang status: skor >= optimal -> Optimal, >= suboptimal -> Suboptimal, selain itu Requires Reassignment.
  THRESHOLDS: { optimal: 80, suboptimal: 60 },

  // Jam kerja efektif per hari, dipakai untuk deadline feasibility.
  HOURS_PER_DAY: 8,

  // Priority tidak menambah skor, tapi memperketat ambang (ambang dinaikkan sekian poin).
  // BELUM DIPUTUSKAN tim: nilai di bawah hanya contoh, ubah ke 0 semua kalau priority tidak dipakai.
  PRIORITY_STRICTNESS: { Low: 0, Medium: 0, High: 3, Critical: 5 },
};