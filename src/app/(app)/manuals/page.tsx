import ManualList from "@/components/ManualList";
import { getUser, isAdmin } from "@/lib/auth";

export default async function ManualsPage() {
  const user = await getUser();
  return <ManualList isAdmin={isAdmin(user)} />;
}
