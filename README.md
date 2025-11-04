# ClassSwitcher Frontend - Phase 2

**Full-Featured Class Planner** - View enrolled schedule and plan tutorial group changes with conflict detection.

## Quick Start

### Recommended: Using npm
```bash
# Navigate to frontend directory
cd frontend

# Start development server
npm run dev

# Open browser to http://localhost:3000
```

### Alternative Options

**Using Python:**
```bash
cd frontend
python -m http.server 3000
```

**Using VS Code Live Server:**
1. Install "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

**Direct File Opening** (May have CORS issues):
Simply open `index.html` in a web browser. Note: Some browsers may block loading JSON files due to CORS restrictions.

## Features

✅ **Viewing Mode**
- Calendar displays all enrolled sessions (lectures + tutorials)
- Week-by-week navigation (Weeks 1-11)
- Term switching (Autumn Term / Winter Term)
- "Today" button to jump to current week
- Sidebar showing enrolled courses with group details
- Click events to view session details in modal popup

✅ **Planning Mode**
- Toggle planning mode to explore alternative tutorial groups
- Course filtering - show/hide individual courses
- View alternatives - toggle between "My Sessions" and "All Sessions" per course
- Click to select alternative tutorial groups
- Visual state indicators:
  - Enrolled groups (solid fill)
  - Selected alternatives (yellow border + solid fill)
  - Available alternatives (dotted border + transparent fill)
  - Lectures (striped pattern, always shown)
- Change tracking with indicators in sidebar
- Conflict detection with visual warnings

✅ **Conflict Detection**
- Real-time detection of scheduling conflicts
- Conflicting events highlighted with red borders
- Warning when attempting to save/apply changes with conflicts
- Supports multiple overlapping sessions

✅ **Planning Actions**
- **Cancel** - Discard all changes and exit planning mode
- **Save** - Save changes for later without applying
- **Apply** - Apply changes immediately (with conflict confirmation)

✅ **Data-Driven Display**
- 4 sample courses with comprehensive session data
- EC101: Autumn Term only (4 tutorial groups)
- MA201: Autumn Term only (3 tutorial groups)
- CS202: Autumn & Winter Terms (4 tutorial groups)
- ST227: Autumn & Winter Terms (3 tutorial groups)

✅ **Visual Design**
- Color-coded courses (neutral, color-blind friendly palette)
- Striped pattern for lectures
- State-based styling for tutorials
- Responsive layout with mode-specific sidebars
- Smooth transitions and animations

## Project Structure

```
frontend/
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # Custom styles
├── js/
│   ├── app.js            # Main application class
│   ├── config.js         # Configuration constants
│   ├── utils.js          # Helper functions
│   ├── planningState.js  # Planning mode state management
│   └── conflictDetector.js  # Conflict detection logic
└── data/
    ├── courses.json      # Course definitions
    ├── groups.json       # Tutorial/lecture groups
    ├── sessions.json     # Individual class sessions
    └── enrollment.json   # Current enrollment status
```

## Sample Data Overview

### Courses
- **EC101** - Introduction to Economics (AT only)
- **MA201** - Calculus and Applications (AT only)
- **CS202** - Data Structures (AT & WT)
- **ST227** - Probability and Statistics (AT & WT)

### Current Enrollment
- EC101: Tutorial Group 2 (Wed 10:00-11:30)
- MA201: Tutorial Group 1 (Mon 10:00-11:30)
- CS202: Tutorial Group 2 (Wed 3:00-4:30)
- ST227: Tutorial Group 1 (Wed 4:00-5:30)

### Sessions Coverage
- Lectures: Weeks 1-11
- Tutorials: Weeks 2-11
- All sessions include location and instructor info

**Note on Term Switching**: For Phase 1, the same session data (based on week numbers 1-11) is reused across terms. When you switch from Autumn Term Week 3 to Winter Term Week 3, the calendar will show the enrolled sessions for CS202 and ST227 (the continuing courses) at the same times. In a production system, each term would have separate session entries, but for demonstration purposes, this approach validates the term-switching logic without duplicating all session data.

## Technologies Used

- **Vanilla JavaScript (ES6+)** - No frameworks
- **FullCalendar 6.1.10** - Calendar rendering
- **Tailwind CSS (CDN)** - Utility-first styling
- **Static JSON** - Data layer

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari

## Development Notes

### Clean Code Principles
✅ No unnecessary libraries
✅ Modular structure (config, utils, app, state management)
✅ Clear separation of concerns
✅ Data-driven, no hardcoded assumptions
✅ Readable variable names
✅ Immutable state patterns
✅ Efficient conflict detection algorithms

### Implementation Highlights
- **State Management**: Separate `PlanningState` class for clean state handling
- **Conflict Detection**: Optimized O(n log n) algorithm for scheduling conflicts
- **Full Rerender Approach**: Calendar events completely refreshed on state changes
- **Nested Data Structure**: O(1) session lookup with `{ GroupID: { Term: [sessions] } }`
- **Visual Feedback**: Clear state indicators and smooth transitions

## Troubleshooting

**Problem**: Calendar doesn't load
- **Solution**: Make sure you're using a local server (not opening files directly)
- Check browser console for errors

**Problem**: No sessions appear
- **Solution**: Verify current date falls within AT or WT term dates
- Use term selector to manually switch terms

**Problem**: Week navigation doesn't work
- **Solution**: Ensure current week is within 1-11 range
- Check browser console for JavaScript errors

## Testing Checklist

### Viewing Mode
- [ ] Calendar loads and displays current week
- [ ] Week navigation (Prev/Next) works
- [ ] Term selector switches between AT/WT
- [ ] "Today" button jumps to current week
- [ ] Sidebar shows 4 enrolled courses with group info
- [ ] Lectures have striped pattern
- [ ] Tutorials have solid fill
- [ ] Each course has distinct color
- [ ] Click shows session details in modal popup
- [ ] Modal can be closed via X button, clicking outside, or Escape key
- [ ] Responsive layout (resize browser)

### Planning Mode
- [ ] Planning mode toggle button works
- [ ] Header changes to amber when planning mode is active
- [ ] Planning sidebar appears with course filters
- [ ] Course visibility checkboxes work
- [ ] "My Sessions" / "All Sessions" toggle works per course
- [ ] Clicking alternative sessions selects them (yellow border)
- [ ] Clicking selected sessions deselects them (reverts to enrolled)
- [ ] Change indicators appear in sidebar
- [ ] Lectures remain non-interactive (can view details only)
- [ ] Cancel button discards changes
- [ ] Save button stores changes
- [ ] Apply button confirms and exits planning mode

### Conflict Detection
- [ ] Conflicts are detected when sessions overlap
- [ ] Conflicting events show red borders
- [ ] Warning appears when applying changes with conflicts
- [ ] Conflict count is accurate
- [ ] Conflicts clear when resolved

---

**Phase 1 Status**: ✅ Complete  
**Phase 2 Status**: ✅ Complete  
**Next**: Backend Integration & Real Enrollment Updates