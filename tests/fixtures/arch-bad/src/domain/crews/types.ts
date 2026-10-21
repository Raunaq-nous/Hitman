// Deliberately bad: a types module importing the service layer (caught by tests/unit/architecture.test.ts).
import { crewCount } from "./service";
export type CrewCount = ReturnType<typeof crewCount>;
