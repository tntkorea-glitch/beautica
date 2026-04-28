import { ServiceForm } from "../ServiceForm";
import { createService } from "../actions";

export default function NewServicePage() {
  return (
    <div className="max-w-xl">
      <h1 className="mb-6 text-2xl font-bold">시술 추가</h1>
      <ServiceForm submit={createService} submitLabel="등록" />
    </div>
  );
}
