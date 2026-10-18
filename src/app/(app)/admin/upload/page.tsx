import { redirect } from "next/navigation";
import UploadForm from "@/components/UploadForm";
import { getUser, isAdmin } from "@/lib/auth";

export default async function UploadPage() {
  if (!isAdmin(await getUser())) redirect("/");
  return <UploadForm />;
}
