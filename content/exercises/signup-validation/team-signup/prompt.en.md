A club accepts a group signup only when the whole roster passes. `validate_all`, which checks one person's form, already exists (on failure it returns a list of all of that person's errors). Use it to implement `validate_team`, which checks the whole roster.

```gleam
// Provided
pub fn validate_all(form: SignupForm) -> Result(NewUser, List(SignupError))

// Function to write
pub fn validate_team(
  forms: List(SignupForm),
) -> Result(List(NewUser), List(#(Int, List(SignupError))))
```

- If everyone passes, return the `NewUser` values in roster order, in `Ok`. An empty roster is `Ok([])`.
- If even one person fails, return in `Error` a `#(number, that person's error list)` for **every** person who failed, in roster order. Do not include people who passed.
- The number is the position in the roster, counted from 1.

```gleam
validate_team([
  SignupForm("mi", "mina@example.com", "s3cret-pw", 20),
  SignupForm("joon", "joon@example.com", "p4ssword!", 31),
  SignupForm("seo", "seo.example.com", "pw", 12),
])
// -> Error([#(1, [UsernameTooShort]), #(3, [InvalidEmail, PasswordTooShort, Underage])])
```
