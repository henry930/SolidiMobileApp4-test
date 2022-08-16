- During development, we want to be able to load a username and password with which to pass basic authentication during an API request to the development server.
- We store these access keys in a file inside the 'values' directory.
- The 'values' directory is ignored by git. We don't want access keys in the codebase.
- Inside the 'empty' directory, we store an empty version of the file, that exports an object with the same format.
- In AppState.js, we conditionally import one of these files, depending on whether the appTier is 'dev' or not.

Setup:
- Copy the file devBasicAuth.js from 'empty' to 'values' directory.
- Open it and insert the basic authentication username & password.
