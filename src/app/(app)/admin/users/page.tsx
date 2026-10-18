import { redirect } from "next/navigation";
import UserAdmin from "@/components/UserAdmin";
import { getUser, isAdmin } from "@/lib/auth";

export default async function UsersPage() {
  const user = await getUser();
  if (!user || !isAdmin(user)) redirect("/");
  return <UserAdmin currentUserId={user.id} />;
}
