import { many, one, exec } from "./db";
import { sendEmail, sendSms } from "./integrations/messaging";
import type { Item, Wishlist } from "./types";

export async function notifyWishlistForItem(itemId: number): Promise<{ notified: number }> {
  const item = await one<Item>("SELECT * FROM items WHERE id = ?", [itemId]);
  if (!item || item.quantity <= 0) return { notified: 0 };
  const wishes = await many<Wishlist & { email: string | null; phone: string | null; name: string }>(`
    SELECT w.*, c.email, c.phone, c.name FROM wishlist w
    JOIN customers c ON c.id = w.customer_id
    WHERE w.notified_at IS NULL AND (w.item_id = ? OR (w.style_id = ? AND w.style_id IS NOT NULL))
  `, [item.id, item.style_id]);
  let notified = 0;
  for (const w of wishes) {
    const subject = `Back in stock: ${item.name}`;
    const body = `Hi ${w.name.split(" ")[0]},\n\nThe ${item.name}${item.size ? ` in ${item.size}` : ""}${item.color ? `, ${item.color}` : ""} you wished for is back. We'll hold one for 48 hours — reply if you'd like us to set it aside.\n\n— Satorial`;
    if (w.notify_email && w.email) await sendEmail({ to: w.email, subject, html: body.replace(/\n/g, "<br/>") });
    if (w.notify_sms && w.phone) await sendSms({ to: w.phone, body });
    await exec("UPDATE wishlist SET notified_at = datetime('now') WHERE id = ?", [w.id]);
    notified++;
  }
  return { notified };
}
