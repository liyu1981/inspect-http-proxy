# UI Revamp Plan

## Goals
- Improve navigation efficiency by making the navbar expanded by default and reordering items.
- Enhance the "Recent Traffic" experience by supporting multiple pinned sessions and better time-range filtering.
- Simplify configuration selection by using URL-driven state.

## 1. Navbar Reorganization
- **Default State**: Set the navigation sidebar to be expanded by default (`navExpanded: true`).
- **Reorder Items**:
    1. **Proxy Servers**: Move to the first position.
    2. **Recent Traffic**: Default landing/second item.
    3. **Pinned Recent Sessions**: (New dynamic section)
    4. **History Traffic**: Move to bottom section.
    5. **Saved**: Move to bottom section.
    6. **System Settings**: Remain at bottom.

## 2. Dynamic Recent Traffic Sessions
- **State Management**: Introduce a global state (using Jotai) to track "Pinned Recent Traffic" configurations.
- **Navbar Integration**:
    - Dynamically add entries to the navbar for each pinned configuration.
    - Each entry will show "Recent: <ConfigName>".
    - Provide a "Close" (X) button on hover to remove the pinned session from the navbar.
- **Persistence**: Save the list of pinned configuration IDs to `localStorage` to persist across reloads.

## 3. Recent Traffic Page Enhancements
- **URL-Driven State**:
    - Use `config_id` query parameter to determine which configuration to show.
    - Use `from` query parameter (Unix timestamp) to determine the starting point for traffic.
- **Header UI Changes**:
    - Remove the `ConfigSelector` dropdown.
    - Display the configuration label as a static heading/breadcrumb.
    - Replace the "Showing records from" button with a more robust "Time Range" selector.
- **Time Range Selector**:
    - Provide presets: "Past 30 mins", "Past 1 hour", "Today", "Past Week".
    - Selecting a preset updates the `from` query parameter and refreshes the list.
    - "Today" should default to 00:00:00 of the current local day.
- **Remove LocalStorage for Time**: Stop saving/restoring `recent_start_time` from `localStorage` in favor of the `from` query param.

## 4. Proxy Server Management Integration
- **ConfigCard Update**:
    - Add a "Monitor Recent Traffic" button to each configuration card in the Proxy Servers page.
    - Clicking this button will:
        1. Add the configuration to the Pinned Recent Sessions list.
        2. Navigate to `/recent?config_id=<ID>&from=<TodayTimestamp>`.

## 5. Implementation Steps

### Phase 1: Global State & Navbar
- [ ] Create `pinnedConfigsAtom` in a new or existing Jotai store.
- [ ] Update `AppNavSidebar` to default to expanded.
- [ ] Implement rendering of pinned items in `AppNavSidebar` with a close button.
- [ ] Reorder `navItems` in `nav-items.tsx`.

### Phase 2: Recent Traffic Page
- [ ] Update `RecentPage` to extract `config_id` and `from` from URL.
- [ ] Implement the new Header with label and Time Range selector.
- [ ] Update data fetching logic to use the `from` timestamp from URL.

### Phase 3: Proxy Server Page
- [ ] Update `ConfigCard` to include the "Monitor Recent Traffic" button.
- [ ] Implement the logic to pin and navigate.

### Phase 4: Refinement
- [ ] Ensure navigation highlights the correct pinned session.
- [ ] Verify persistence of pinned sessions across page reloads.
