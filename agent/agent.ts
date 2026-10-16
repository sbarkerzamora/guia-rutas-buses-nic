import { defineAgent } from "eve";
import { nvidiaContextWindowTokens, nvidiaModel } from "./lib/nvidia";

export default defineAgent({
  model: nvidiaModel,
  modelContextWindowTokens: nvidiaContextWindowTokens,
});