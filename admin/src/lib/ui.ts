function statusClass(status: string) {
  const s = status.toLowerCase();
  if (s === "paid" || s === "active") return "badge badge-ok";
  if (s === "pending") return "badge badge-warn";
  if (s === "rejected" || s === "revoked") return "badge badge-danger";
  return "badge badge-muted";
}

export { statusClass };
