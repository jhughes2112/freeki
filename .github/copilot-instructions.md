Never use Linq.  
Never use var, always use explicit types.  
Never have multiple returns from a function, always prefer nested conditions where the successful cases come first and failures are the else cases.
Never use emojis or unicode characters, it breaks my editor.  
Never delete a file and try to rewrite it.
Use ANSI bracing format.

Always try to use edit_file multiple times if it doesn't seem to work.
Always try to use get_file multiple times if it doesn't seem to work.
Anytime a tool fails, print out exactly how you tried to call it, so I can suggest fixes.
Summarize operations you were about to perform if the tools keep failing.    

I prefer variable declarations and assignments to visually line up so the code is easier to read.  
Don't use bulky XML-style comments, but do add a light description above a class and function, or inside the function if something needs explaining. 
Fix all warnings if you can.  
I like using nullables, and if async methods aren't async, remove the keyword and return Task.FromResult()

When you try to use terminal commands, always use the semicolon between commands, NOT && because it does not work.
Specifically: The token '&&' is not a valid statement separator in this version.
