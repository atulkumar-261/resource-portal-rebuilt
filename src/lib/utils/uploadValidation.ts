import { toast } from "sonner";
import { MAX_UPLOAD_SIZE } from "@/lib/constants/upload-constants";

export function validateFileSize(file?: File | null) {
  if (!file) return false;

  if (file.size > MAX_UPLOAD_SIZE) {
    toast.error("File size cannot exceed 10MB.");
    return false;
  }

  return true;
}

export function validateImageFile(file?: File | null) {
  if (!file) return false;

  const allowed = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (!allowed.includes(file.type)) {
    toast.error("Only image files are allowed.");
    return false;
  }

  return validateFileSize(file);
}
