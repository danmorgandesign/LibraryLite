# Library Lite flows (FigJam summary)

Source: [Library Lite Flows board](https://www.figma.com/board/6TADZXvo4PxMned1su6bZP/Library-Lite-Flows?node-id=35-360) (file key `6TADZXvo4PxMned1su6bZP`). Summarised 2026-10-13. Text is quoted from the board; typos fixed.

## What the product is
A school library tool: staff scan book barcodes to catalogue them and loan them to children, organised by school, class and teacher. Schools register, are authorised by Library Lite, then invite their teachers.

## Information architecture (new, node 35:360)
Three tiers of access:
- **Public:** Landing Page, Register School, Login.
- **Restricted (school registration flow):** School Name → Address & Contacts → Add starting email address → Send email to Library Lite to authorise the school → Send email to the starting email address.
- **Authenticated user:** Manage Class (class view depends on which teacher is logged in), Scan Book, View Books.

## Information architecture (earlier, node 17:500)
Top-level areas: **Library** (Search Books, Add Book), **Admin** (Manage Classes, Users), **Loans** (filter by class), plus a **Loan Book** call to action. Treat 35:360 as the newer structure; this one adds Search, Users admin and the Loans list.

## Teacher onboarding (node 35:210)
1. The original admin (the paying account) gives an email address.
2. That address gets an email with a unique link to a page reachable only via that link.
3. On that page the admin sets up classes, each with a teacher's email address.
4. Each teacher is emailed a unique invite link to set up their class with its children.

## V2 scan flow (node 26:242) — the core V2 interaction
One "Scan book" entry point that branches on the book's state:
- **Not in the catalogue** → Add it → either *catalogue without loaning* or go on to *loan it*.
- **In the catalogue (available)** → Loan it → Choose class → Choose child.
- **In the catalogue, on loan** → Return it.

## Book loan flow (V1-era, node 15:308)
Scan book → correct book? → choose class → choose child → confirm loan, recording the loan date in the database. If the book can't be found, add it to the collection, then continue to choose class.

## Book scanning / cataloguing flow (node 15:323)
Start → Landing page (Scan button and Recent Books) → camera permission? (granted) → scan barcode → book found?
- Yes → confirm book info. No → enter ISBN or scan the book cover → confirm book info.
- Then: already in database? Yes → back to landing page. No → select category (Fiction / Non-fiction and sub-genre) → save to database → end.
- The board does not show the camera-permission-denied branch.

## Barcode not finding a book (node 32:224)
Barcode lookup fails → manually enter title and author → attach those details to the scanned barcode and save the book to the database (so the same barcode resolves next time).

## Key decisions and open points
- V2 collapses cataloguing, loaning and returning into a single scan whose outcome depends on catalogue/loan state.
- Multi-tenant model: school → classes → teachers → children; teachers only see their own classes.
- Schools need manual authorisation by Library Lite before going live; invites are by unique emailed links (no open sign-up for teachers).
- Books carry a category (Fiction / Non-fiction plus sub-genre).
- Not shown on the board: camera-denied fallback, loan due dates or overdue handling, how children are added (beyond "teachers set up classes with children"), and whether children log in (assumed not).
