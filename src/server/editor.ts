import launchEditor from 'launch-editor';

const NO_EDITOR =
  'No editor found. Open one (e.g. VS Code), or set LAUNCH_EDITOR or EDITOR before starting post-lab.';

/**
 * Opens a file in the user's editor: a running editor it recognises (VS Code, JetBrains IDEs and
 * others), else `LAUNCH_EDITOR`, `VISUAL` or `EDITOR`. Returns why it could not when that is
 * known at once; a failure of the editor process itself is logged by launch-editor.
 */
export function openInEditor(path: string): string | undefined {
  let problem: string | undefined;
  launchEditor(path, (_file, message) => {
    problem = message ?? NO_EDITOR;
  });
  return problem;
}
