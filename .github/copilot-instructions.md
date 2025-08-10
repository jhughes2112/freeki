# COPILOT EDITS OPERATIONAL GUIDELINES

Talk to me like a real developer, not a customer service bot.  I am crass and grumpy, and appreciate extremely creative and disgusting euphemisms, like Robin Williams on a coke high.
If you have not read it in this session, read the apiSummary.ts so you know the overview of the client architecture.  Maintain this file with useful details to accelerate your understanding.
It is a terrible habit to have optional or default parameters.  If something is a parameter, require it, and do not try to defend against it not being provided, just make it an error.  DEMAND correct parameters.
If you ever suggest "debounce" you know you are doing it wrong, don't do it, don't suggest it, don't try to slip it past me.

## TOOL USE
* If `edit_file` appears to fail, use `get_file` to verify if the change has happened or not, sometimes the change succeeded but the tool claims it failed.
* Similarly, if `get_file` appears to fail, retry several times slightly different ways, it also fails and makes it appear other tools have failed.
* If any tool fails, say so, but retry.  Always use the tool-calling json format carefully.
* If tools keep failing, it is your fault.  It is not your job to tell me what to do, I want you to do it.
* **NEVER** call `run_command_in_terminal`. This tool is broken. If a shell command is needed, suggest another approach or tell me what to run.

## MAKING EDITS

* After a feature is complete, always attempt to build the project and resolve all warnings and errors before continuing
* If there is unfinished work, summarize what work is unfinished.

## C-SHARP CONVENTIONS

* **Never** use LINQ
* **Never** use `var`—always use explicit types
* **Never** return early from functions; structure them so that successful outcomes come first, failures in the `else`
* **Never** use emojis or Unicode characters—they break the editor
* **Never** delete and regenerate a file from scratch
* Use **ANSI bracing style** (opening brace on new line)
* Align variable declarations and assignments vertically for readability
* Avoid bulky XML comments. Use short inline or block comments to explain logic only where necessary
* If an `async` method doesn't await anything, remove `async` and return `Task.FromResult(...)`
* Nullable types are preferred where applicable

## BROWSER COMPATIBILITY

* Use wrapper functions or utilities for browser feature detection (e.g., `if ('fetch' in window)`), instead of inlining detection logic
* Only support the two most recent stable versions of Chrome, Firefox, Edge, Safari.  No need for legacy support.

## The following relates to HTML:

* Always use labels for form fields
* Use appropriate **ARIA roles and attributes**
* Include `alt` attributes or `aria-label` for images/media
* Use semantic HTML structure for screen reader compatibility
* Validate HTML with W3C
* Ensure responsive layout
* Use `loading="lazy"` for non-critical images
* Generate `srcset` and `sizes` for responsive images

## The following relate to CSS:

* Never use rgba() it is confusing.
* Use modern layout systems: **Flexbox** and **Grid**
* Use **CSS custom properties** for theme/variables
* Use CSS transitions/animations where helpful
* Use media queries and **logical properties** (`padding-inline`, etc.)
* Use selectors like `:is()`, `:has()` when appropriate
* Follow **BEM** or similar naming schemes
* Use **CSS nesting** appropriately
* Support dark mode via `prefers-color-scheme`
* Prefer **responsive units** like `rem`, `vh`, `vw`
* Use performant, **variable fonts** where appropriate

## The following relate to Javascript and Typescript:

* Avoid `var` keyword
* Avoid jQuery or any external libraries
* Avoid Callback-style async code (prefer Promises)
* Avoid Internet Explorer compatibility
* Avoid Legacy module systems (prefer ES modules)
* Avoid `eval()` for any reason

* Use `try-catch` consistently in async/API contexts
* Always handle promise rejections
* Centralize error reporting when possible
* Validate JSON responses and handle incorrect HTTP status codes

## SECURITY CONSIDERATIONS

* Sanitize all user inputs
* Use parameterized SQL queries
* Enforce strict Content Security Policies
* Use CSRF protection where needed
* Set cookies with `Secure`, `HttpOnly`, and `SameSite=Strict`
* Use role-based access control with least-privilege defaults
* Add detailed logging and monitoring for internal operations
