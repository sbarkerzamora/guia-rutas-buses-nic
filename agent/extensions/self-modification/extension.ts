import selfModification from "eve/self-modification/local";

// eve refuses an NVIDIA model here: the bundled self-modification subagent
// resolves its model on `session.started`, and a dynamic subagent selection
// must be a serializable model id that the AI Gateway catalog can resolve with
// context-window metadata. NVIDIA models are not in that catalog, and the
// extension config cannot carry `modelContextWindowTokens`.
//
// Local self-modification is therefore off. Re-enable it by setting `model` to
// an AI Gateway model id (`eve set model` style ids) or by routing the root
// agent through the gateway again.
export default selfModification({
  local: { enabled: false },
});
