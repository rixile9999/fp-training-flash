Gleam 1.18 syntax reference for coaching (verified against gleam 1.18.1 on 2026-09-30).

Target: Erlang, gleam_stdlib 1.0.5. `// -> 3` shows the value an expression evaluates to. Short fragments omit obvious imports (`import gleam/int` etc.). Blocks marked `// invalid` do not compile.

## Modules and imports

A file is a module named by its path under `src/` (`src/shop/cart.gleam` is `shop/cart`). Imported names are qualified by the last path segment (`list.map`). `.{...}` imports functions and constructors unqualified; types need the `type` keyword. `as` renames a module.

```gleam
import gleam/io
import gleam/list.{map}
import gleam/option.{type Option, None, Some}
import gleam/string as str

pub fn main() -> Nil {
  let names: List(Option(String)) = [Some("ann"), None]
  let shown = map(names, fn(n) { option.unwrap(n, "?") })
  io.println(str.join(shown, ", "))
}
```

## Functions and `pub`

The last expression is the return value; there is no `return`. Annotations are optional (inferred) but conventional on top-level functions. Functions, types and constants are module-private unless marked `pub`.

```gleam
pub fn perimeter(width: Int, height: Int) -> Int {
  double(width + height)
}

fn double(x) {
  x * 2
}
```

## Let bindings and shadowing

Bindings are immutable. A new `let` with the same name shadows the old binding; nothing is mutated. Names starting with `_` may be unused.

```gleam
let x = 1
// shadows the first x; nothing is mutated
let x = x + 1
let label: String = "count"
let _unused = label
x // -> 2
```

## Blocks `{ }`

A block is an expression returning its last expression. Blocks are also the only way to group arithmetic: parentheses do NOT group expressions.

```gleam
let total = { 1 + 2 } * 3 // -> 9
let y = {
  let a = 10
  let b = 20
  a + b
}
y // -> 30
```

## Int vs Float

Separate types, separate operators: `+ - * / %` and `< > <= >=` for Int; `+. -. *. /.` and `<. >. <=. >=.` for Float. No implicit conversion: use `int.to_float`, `float.round`, `float.truncate`. Ints are arbitrary precision on Erlang. Unary `-` only negates Ints; for a Float variable use `float.negate`. Literals allow `1_000`, `0xFF`, `0o17`, `0b1010`.

```gleam
let i = 7 + 2 * 3 // -> 13
let f = 7.0 /. 2.0 // -> 3.5
let mixed = int.to_float(i) +. f // -> 16.5
let neg = float.negate(f) // -> -3.5
i < 20 && f <. 4.0 // -> True
```

`/` on Int truncates toward zero, and `%` is the remainder (sign follows the dividend). Division by zero does not crash: `x / 0` is `0`, `x % 0` is `0`, and `x /. 0.0` is `0.0`. Use `int.divide` (returns `Result`) or `int.floor_divide` / `int.modulo` when that matters.

```gleam
let zero = 0
let a = 7 / 2 // -> 3
let b = -7 / 2 // -> -3
let c = -7 % 2 // -> -1
let d = 7 / zero // -> 0
let e = 1.0 /. 0.0 // -> 0.0
int.divide(7, by: zero) // -> Error(Nil)
```

## Bool, equality, comparison

`Bool` is `True` / `False`, with `&&`, `||` (short-circuiting) and `!`. `==` / `!=` compare any two values of the same type structurally (lists, tuples and records deeply); comparing different types is a type error. `<` etc. only work on Int/Float; use `string.compare` for strings.

```gleam
let ok = True && !False // -> True
let same = [1, 2] == [1, 2] // -> True
#(1, "a") != #(1, "b") // -> True
```

## Strings

Strings use double quotes, are UTF-8, and may span multiple lines. Concatenate with `<>` (not `+`). Escapes include `\n`, `\t`, `\"`, `\\` and `\u{1F600}`. There is no interpolation: convert with `int.to_string`, `float.to_string`, or `string.inspect` for any value.

```gleam
let name = "Joe"
let greeting = "Hello, " <> name <> "!" // -> "Hello, Joe!"
let msg = "n = " <> int.to_string(42) // -> "n = 42"
string.length("héllo") // -> 5
```

## Lists

`List(a)` is an immutable singly linked list of same-typed elements. Prepending `[x, ..rest]` is O(1); `list.append` and `list.length` are O(n). No index access (`xs[0]` parses as `xs` followed by the list `[0]`); use pattern matching, `list.first` or `list.drop`.

```gleam
let xs = [2, 3]
let ys = [1, ..xs] // -> [1, 2, 3]
let first = list.first(ys) // -> Ok(1)
let head = case ys {
  [] -> 0
  [h, ..] -> h
}
head // -> 1
```

## Tuples

`#(a, b, ...)` holds a fixed number of values of any types. Access with `.0`, `.1`, ... or destructure with `let`.

```gleam
let pair = #("age", 42)
let key = pair.0 // -> "age"
let #(_, value) = pair
value // -> 42
```

## Custom types and records

A custom type lists its variants (constructors), each optionally with fields; names are `UpperCamelCase`. A single-variant type is a "record". Labelled fields are read with `.label` when every variant has that field. Construct with positional or labelled arguments (`field:` alone means `field: field`). Record update `Constructor(..record, field: value)` returns a new record copying the other fields; the original is unchanged.

```gleam
pub type Shape {
  Circle(name: String, radius: Float)
  Rectangle(name: String, width: Float, height: Float)
}

pub type Person {
  Person(name: String, age: Int)
}

pub fn demo() -> String {
  let name = "Ann"
  let p = Person(name:, age: 30)
  let shape = Circle(name: "c1", radius: 1.0)
  p.name <> shape.name
}

pub fn birthday(p: Person) -> Person {
  Person(..p, age: p.age + 1)
}
```

## Generics

Lower-case names in types are type variables. Custom types and functions can be generic.

```gleam
pub type Box(a) {
  Box(value: a)
}

pub fn map_box(box: Box(a), f: fn(a) -> b) -> Box(b) {
  Box(f(box.value))
}
```

## Type aliases

`type Name = ExistingType` gives another name to a type; it is fully interchangeable with it (no new type is created).

```gleam
pub type UserId =
  Int

pub fn next_id(id: UserId) -> UserId {
  id + 1
}
```

## Opaque types

`pub opaque type` exports the type but not its constructors or field access, so other modules must use the module's functions. This is how invariants ("smart constructors") are enforced.

```gleam
pub opaque type Email {
  Email(value: String)
}

pub fn parse(s: String) -> Result(Email, String) {
  case string.contains(s, "@") {
    True -> Ok(Email(s))
    False -> Error("missing @")
  }
}

pub fn to_string(email: Email) -> String {
  email.value
}
```

## Nil

`Nil` is the unit type and its only value. Side-effecting functions such as `io.println` return `Nil`; `Error(Nil)` means "failed, no details".

## `case` expressions

`case` tries patterns top to bottom and returns the first matching branch's value; all branches have the same type. Patterns: literals, variables, `_`, constructors, tuples, lists (`[]`, `[x]`, `[x, ..rest]`), string prefixes (`"prefix" <> rest`), `as` to name a sub-pattern. `|` separates alternatives; `if` adds a guard; `case a, b` matches several subjects.

```gleam
pub fn describe(n: Int) -> String {
  case n {
    0 -> "zero"
    1 | 2 | 3 -> "small"
    x if x < 0 -> "negative"
    _ -> "large"
  }
}

pub fn command(input: String) -> String {
  case input {
    "say " <> rest -> rest
    "quit" -> "bye"
    _ -> "unknown"
  }
}

pub fn shape(xs: List(Int)) -> List(Int) {
  case xs {
    [] | [_] -> xs
    [a, b, ..] as all if a < b -> all
    [_, ..rest] -> rest
  }
}

pub fn both(a: Bool, b: Result(Int, Nil)) -> Int {
  case a, b {
    True, Ok(n) -> n
    _, _ -> 0
  }
}
```

Guards can use variables, literals, constants, comparisons, `&&` `||` `!`, arithmetic, field access and tuple indexing, but cannot call functions. String patterns can only match a literal prefix, not a suffix; list patterns cannot match the end of a list (`[..rest, last]` is invalid).

## Exhaustiveness

`case` must cover every possible value, otherwise it is a compile error ("Inexhaustive patterns") listing the missing patterns. A plain `let` pattern must also be irrefutable (tuples, single-variant records); use `case` or `let assert` for patterns that can fail. Unreachable branches get a warning.

## No `if`/`else`, no loops

Gleam has no `if`, `else`, `for`, `while`, `break` or `return`. Branch with `case` (including `case cond { True -> ... False -> ... }`) and iterate with recursion or `gleam/list` functions (`map`, `filter`, `fold`, `each`, ...). `int.range` folds over a range of Ints (start inclusive, end exclusive).

```gleam
pub fn sign(n: Int) -> String {
  case n >= 0 {
    True -> "non-negative"
    False -> "negative"
  }
}

pub fn count_up() -> List(Int) {
  int.range(from: 0, to: 3, with: [], run: fn(acc, i) { [i, ..acc] })
  |> list.reverse
}
```

## Recursion and tail calls

A call in tail position (the last thing a function does) is optimised and does not grow the stack, so accumulator-style recursion is the idiomatic loop. Non-tail recursion (`n + f(rest)`) grows the stack with input size.

```gleam
pub fn sum(xs: List(Int)) -> Int {
  sum_loop(xs, 0)
}

fn sum_loop(xs: List(Int), acc: Int) -> Int {
  case xs {
    [] -> acc
    [x, ..rest] -> sum_loop(rest, acc + x)
  }
}
```

## Anonymous functions and captures

`fn(x) { ... }` is an anonymous function (a closure). Function types are written `fn(A, B) -> C`. A capture `f(a, _)` is shorthand for `fn(x) { f(a, x) }`; only one `_` hole is allowed. Named functions are passed directly (`list.map(xs, int.to_string)`).

```gleam
fn add(a: Int, b: Int) -> Int {
  a + b
}

pub fn demo() -> List(String) {
  let offset = 10
  let add_offset = fn(x) { x + offset }
  let add_one: fn(Int) -> Int = add(_, 1)
  [1, 2] |> list.map(add_offset) |> list.map(add_one) |> list.map(int.to_string)
}
```

## Pipe `|>`

`a |> f(b)` passes `a` as the FIRST argument: `f(a, b)`. `a |> f` is `f(a)`. To pipe into another position, use a capture: `a |> f(b, _)`.

```gleam
let result =
  "  Hello  "
  |> string.trim
  |> string.append(" world")
  |> string.replace("o", "0")
result // -> "Hell0 w0rld"
let text = "b" |> string.append("a", _) // -> "ab"
```

## Labelled arguments

Parameters can have a label (used by callers) separate from the internal name: `fn f(label name: Type)`. Labelled arguments may be passed in any order, but positional arguments must come before labelled ones. `label:` alone is shorthand for `label: label`.

```gleam
pub fn replace(
  in text: String,
  each pattern: String,
  with replacement: String,
) -> String {
  string.replace(text, pattern, replacement)
}

pub fn demo() -> String {
  let with = "_"
  let a = replace(each: " ", with: "-", in: "a b c")
  let b = replace("a b", each: " ", with:)
  a <> b
}
```

## Result and Option

Errors are values: built-in `Result(value, error)` is `Ok(value)` or `Error(error)`. `Option(a)` (`Some(a)` / `None`, from `gleam/option`) is for optional values; `Result` is for operations that can fail. Many stdlib functions return `Result(a, Nil)` (`list.first`, `int.parse`). Helpers: `result.map`, `result.try`, `result.unwrap`, `option.map`, `option.unwrap`.

```gleam
import gleam/int
import gleam/option.{type Option}

pub fn parse_age(s: String) -> Result(Int, String) {
  case int.parse(s) {
    Ok(n) if n >= 0 -> Ok(n)
    Ok(_) -> Error("negative")
    Error(Nil) -> Error("not a number")
  }
}

pub fn nickname(n: Option(String)) -> String {
  option.unwrap(n, "anonymous")
}
```

## `use` expressions

`use x <- f(args)` turns the rest of the enclosing block into a callback passed as the LAST argument of `f`: sugar for `f(args, fn(x) { rest })`. It works with any function whose last parameter is a function, commonly `result.try` (stop at the first `Error`), `bool.guard` (early exit) and list functions.

```gleam
pub fn add_strings(a: String, b: String) -> Result(Int, Nil) {
  use x <- result.try(int.parse(a))
  use y <- result.try(int.parse(b))
  Ok(x + y)
}

pub fn safe_div(a: Int, b: Int) -> Int {
  use <- bool.guard(when: b == 0, return: 0)
  a / b
}

pub fn pairs(xs: List(Int)) -> List(#(Int, Int)) {
  use x <- list.flat_map(xs)
  use y <- list.map(xs)
  #(x, y)
}
```

## `let assert`, `panic`, `todo`

`let assert pattern = value` binds a refutable pattern and crashes the process if it does not match. `panic` crashes unconditionally; `todo` marks unfinished code (compile warning, crashes if run). All accept `as "message"`. Use them for impossible states, not expected errors (return `Result`).

```gleam
pub fn first_digit(s: String) -> Int {
  let assert Ok(n) = int.parse(s) as "caller guarantees digits"
  n
}

pub fn unreachable() -> Int {
  panic as "this should never happen"
}

pub fn later(_x: Int) -> Int {
  todo as "implement later"
}
```

## `assert` (tests)

`assert expr` (Gleam 1.11+) crashes if the Bool expression is `False`, reporting the code and the left/right values; `as "message"` adds context. With gleeunit, tests are `pub fn`s ending in `_test` under `test/`.

```gleam
import gleam/list

pub fn reverse_test() {
  assert list.reverse([1, 2, 3]) == [3, 2, 1]
  let xs = [1, 2]
  assert list.length(xs) == 2 as "two elements"
}
```

## `echo`

`echo value` prints the value (in Gleam syntax) with its file and line to stderr and returns it unchanged, so it can be dropped into pipelines (`|> echo`). It is for debugging; remove it from finished code.

```gleam
pub fn debug(xs: List(Int)) -> Int {
  xs
  |> list.map(fn(x) { x * 2 })
  |> echo
  |> list.fold(0, int.add)
}
```

## Constants

Module-level values use `const` (no top-level `let`). Constants are literal values (numbers, strings, lists, tuples, records, other constants); function calls are not allowed.

```gleam
pub const max_players = 4

const greeting = "hello"

pub const defaults = #(greeting, [1, 2, 3])

pub fn limit() -> Int {
  max_players * 2
}
```

## No null, no exceptions

There is no `null`/`nil`/`undefined`: absence is `Option`, failure is `Result`, both handled explicitly (`case`, `result.try`, `use`). There is no `try`/`catch`/`throw`; `panic` and `let assert` crash the process.

## Common mistakes from other languages

```gleam
// invalid: each line is a mistake a learner might bring from another language
if x > 0 { "pos" } else { "neg" }      // no if/else (syntax error suggests `case`)
for x in xs { io.println(x) }          // no loops ("The name `for` is not in scope")
fn f(x) { return x + 1 }               // no return ("The name `return` is not in scope")
x = x + 1                              // no reassignment (syntax error, "Use let for binding")
let first = xs[0]                      // no indexing: parses as `xs` then the list `[0]`
let total = (a + b) * c                // parentheses don't group (syntax error, hint: use { })
case x = 1 { True -> 1 False -> 0 }    // `=` binds, `==` compares
let s = "a" + "b"                      // `+` is Int-only; strings use <>
let f = 1.5 + 2.5                      // Float needs +.
let c = 'a'                            // strings use double quotes
let n = null                           // no null ("Unknown variable")
```

The fixed versions:

```gleam
pub fn fixes(x: Int, xs: List(String), a: Int, b: Int) -> Nil {
  let _sign = case x > 0 {
    True -> "pos"
    False -> "neg"
  }
  list.each(xs, io.println)
  let x = x + 1
  let _first = list.first(xs)
  let _total = { a + b } * x
  let _is_one = case x == 1 {
    True -> 1
    False -> 0
  }
  let _s = "a" <> "b"
  let _f = 1.5 +. 2.5
  Nil
}
```

`xs[0]` may compile with only an "unused value" warning, or cause a confusing type error later (the binding is a `List`). Other invalid forms: calling functions in guards, `[..rest, last]` list patterns, `rest <> ".txt"` suffix patterns, semicolons as separators, top-level `let`, and mixing Int and Float in one operation (`1 + 1.5`).
