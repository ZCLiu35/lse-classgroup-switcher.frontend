# ClassSwitcher Frontend - Phase 1

**Viewing Mode Only** - Display enrolled class schedule with static data.

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

## Features (Phase 1)

✅ **Viewing Mode**
- Calendar displays all enrolled sessions (lectures + tutorials)
- Week-by-week navigation (Weeks 1-11)
- Term switching (Autumn Term / Winter Term)
- "Today" button to jump to current week
- Sidebar showing enrolled courses

✅ **Data-Driven Display**
- 4 sample courses with comprehensive session data
- EC101: Autumn Term only (4 tutorial groups)
- MA201: Autumn Term only (3 tutorial groups)
- CS202: Autumn & Winter Terms (4 tutorial groups)
- ST227: Autumn & Winter Terms (3 tutorial groups)

✅ **Visual Design**
- Color-coded courses (neutral, color-blind friendly palette)
- Striped pattern for lectures
- Solid fill for enrolled tutorials
- Responsive layout with sidebar

🚧 **Not Yet Implemented** (Phase 2)
- Planning Mode (viewing alternatives)
- Tutorial group switching
- Conflict detection
- Course filtering

## Project Structure

```
frontend/
├── index.html              # Main HTML file
├── css/
│   └── styles.css         # Custom styles
├── js/
│   ├── app.js            # Main application class
│   ├── config.js         # Configuration constants
│   └── utils.js          # Helper functions
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
✅ Modular structure (config, utils, app)
✅ Clear separation of concerns
✅ Data-driven, no hardcoded assumptions
✅ Readable variable names

### Next Steps (Phase 2)
1. Add Planning Mode toggle
2. Display alternative tutorial groups
3. Implement course filtering in sidebar
4. Add conflict detection
5. Visual distinction for alternative sessions

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

- [ ] Calendar loads and displays current week
- [ ] Week navigation (Prev/Next) works
- [ ] Term selector switches between AT/WT/ST
- [ ] "Today" button jumps to current week
- [ ] Sidebar shows 4 enrolled courses
- [ ] Lectures have striped pattern
- [ ] Tutorials have solid fill
- [ ] Each course has distinct color
- [ ] Hover shows session details
- [ ] Click shows session info alert
- [ ] Responsive layout (resize browser)

---

**Phase 1 Status**: ✅ Complete
**Next**: Phase 2 - Planning Mode & Alternatives