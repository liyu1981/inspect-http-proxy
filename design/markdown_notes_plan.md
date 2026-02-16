# Design: Markdown Support for Saved Traffic Notes

This document outlines the plan to upgrade the notes input in the "Saved Traffic" page to support Markdown syntax with a live preview or toggle-based preview.

## 1. Goals
- Replace the simple `Textarea` for notes with a Markdown-enabled editor.
- Provide a clear preview of the rendered Markdown.
- Maintain the current auto-saving behavior.
- Ensure styling is consistent with Shadcn UI and the rest of the application.

## 2. Research & Component Selection

### 2.1 Rendering: `react-markdown`
- **Why**: Industry standard, highly customizable, and works well with plugins.
- **Plugins**: 
  - `remark-gfm`: Supports GitHub Flavored Markdown (tables, task lists, etc.).
  - `rehype-highlight`: Provides syntax highlighting for code blocks.

### 2.2 Styling: `prose` (Tailwind Typography)
- Use Tailwind's `@tailwindcss/typography` (if available) or manual styling with the `prose` class to ensure Markdown content looks good and matches the application's theme.

### 2.3 Editor Approach: Tabbed Interface (Edit vs. Preview)
- **Why**: Matches common patterns (like GitHub/GitLab). It's cleaner than a side-by-side view in the limited space of the metadata panel.
- **Components**: Use Shadcn UI's `Tabs` to switch between a `Textarea` (Edit) and a `MarkdownPreview` (Preview).

## 3. Implementation Plan

### 3.1 Dependencies
Install the following libraries:
```bash
pnpm add react-markdown remark-gfm rehype-highlight
```

### 3.2 Component: `MarkdownPreview`
Create a new component `frontend/src/app/_components/markdown-preview.tsx`:
- Wraps `react-markdown`.
- Applies the `prose` class and theme-specific styles (dark/light mode).
- Configures plugins (`remark-gfm`).

### 3.3 Update `SavedMetadataEditor`
Modify `frontend/src/app/saved/_components/saved-details.tsx`:
- Wrap the note input in a `Tabs` component.
- **Edit Tab**: Contains the existing `Textarea`.
- **Preview Tab**: Contains the new `MarkdownPreview` component.
- Ensure the `ScrollArea` correctly handles the varying height of rendered Markdown.

### 3.4 Backend Considerations
- **Storage**: No changes needed. Markdown is stored as plain text in the `ProxyBookmark.Note` column (`TEXT`).
- **Data Integrity**: Ensure the existing debounced auto-save works seamlessly with the tab switching.

## 4. UI/UX Details
- **Tabs**: "Write" and "Preview".
- **Placeholder**: Keep the current "Add some context about this session..." placeholder.
- **Empty State**: If the note is empty, the Preview tab should show a muted "Nothing to preview" message.

## 5. Implementation Steps
1.  **Add Dependencies**: Install `react-markdown` and related plugins.
2.  **Create Preview Component**: Implement `MarkdownPreview`.
3.  **Refactor Editor**: Update `SavedMetadataEditor` with the tabbed interface.
4.  **Polish Styling**: Ensure code blocks and lists are styled correctly in both light and dark modes.
5.  **Verification**: Test with various Markdown syntax (tables, code, bold, links).
