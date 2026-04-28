import { StaffForm } from "../StaffForm";
import { createStaff } from "../actions";

export default function NewStaffPage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">스태프 추가</h1>
      <StaffForm submit={createStaff} submitLabel="등록" />
    </div>
  );
}
