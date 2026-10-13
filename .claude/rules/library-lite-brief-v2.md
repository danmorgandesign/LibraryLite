# Library Lite Brief V2

Rewritten Oct 13, 2026 from Dan's notes, his Q&A answers and the Figma flows board.
Source of truth: the "Library Lite Brief V2" Claude Doc (https://claude.ai/code/artifact/3435a4e0-fbde-453f-bf1a-b5bfe4725009). This file is a markdown export of it; update it when the doc changes.

## What Library Lite is

In UK primary schools, lending library books to children is a rushed job squeezed into a busy day. Library Lite is a website that makes that job fast for teachers and other school staff.

Its heart is one action: scan a book's barcode on an iPad. The app works out what state the book is in and offers the next step: add it to the library, loan it to a child, take it back, or renew it. Around that, staff can see who has what, which loans are overdue, and what each child has borrowed in the past.

## Who uses it

It's for school staff only for now. Children and parents don't log in or see anything.

- **School admin:** the account that registered and pays for the school. Sets up the school's classes and invites teachers.
- **Class teachers:** each is linked to a class. They manage their class's children, library day and loan limit, and get the weekly reminder email.
- **Other staff, such as teaching assistants:** these users don't need a class of their own.

Anyone with a login at the school can scan books and loan them to any child in the school.

## The core flow: scan a book

One Scan button covers adding, loaning and returning. The app checks the book's barcode against the school's library and shows only the options that fit.

Scan flow (1 scan, 3 outcomes):

- **Not in the library** → add it → either just add it to the library, or go on to loan it.
- **In the library, available** → loan it → choose class → choose child.
- **In the library, on loan** → return it (or renew it).

When the barcode lookup can't find a book, the title and author typed in are saved against that barcode. The same barcode is then recognised next time. A new book can be loaned straight away or just added to the library.

## Loan rules

- **Loan limit:** each child can have 2 books out at once by default. A class's teacher can change that limit at any time.
- **Colour coding:** every loan shows its age by colour. It's green for days 1 to 7, orange for days 8 to 14 and red from day 15. A loan counts as overdue once it's past a week.
- **Renewing:** this tells the app the teacher has seen the book and is happy for the child to keep it. The loan goes back to green and the week starts again from that day.
- **Weekly reminder:** each teacher gets an email the day before their class's library day. It lists the books their class has on loan, with the same colour coding as the website.
- **Collection:** books belong to the whole school library, not to a class, so any child can borrow any book.

## Managing a class

Each teacher has a Manage Class page that only shows their own class. On it they can:

- see which books each child has on loan now, colour-coded by age
- see each child's borrowing history
- set the class's weekly library day, which most UK primary classes have on their timetable
- change the class's loan limit
- add the children in their class

## Schools, accounts and onboarding

This section comes from the Figma flows board.

1. A school registers on the public site with its name, address, contacts and a starting email address.
2. Library Lite approves the school by hand before it goes live.
3. The starting email address gets a unique link. That person, the school admin, uses it to set up classes and give each one a teacher's email.
4. Each teacher gets their own invite link and sets up their class and its children.

Nobody can sign up without an invite. The site has three parts: public pages (landing page, register, log in), the school registration steps, and the logged-in app (Scan Book, View Books, Manage Class).

## Out of scope for now

- Logins or views for parents or children
- Library cards for children
- Working offline (the site needs a connection)

## Open questions

These come from gaps noticed between the notes and the flows. They're not things Dan has raised.

- What happens if a staff member blocks camera access on the iPad? Could they type the ISBN instead?
- Should a loan be blocked when a child is at their limit, or should staff just be warned?
- Can staff search the whole library and see who has a book? The earlier Figma flow had Search Books and a Loans list.
- The Figma flow asks for a category when a book is added (Fiction or Non-fiction, plus a sub-genre). Is that still wanted?
- When the school admin sets up classes, are they also a teacher, or a separate role?
- What happens to classes and loan history when children move up a year?
