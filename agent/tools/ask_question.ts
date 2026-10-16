import { askQuestion } from "eve/tools/ask_question";

// Framework-owned tool: one question, 2-3 options, the user can always type
// their own answer. The turn waits durably until they answer.
export default askQuestion();
