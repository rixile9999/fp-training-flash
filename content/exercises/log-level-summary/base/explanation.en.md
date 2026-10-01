Splitting the problem into two parts makes each part simple.

1. **Interpreting one line**: `level_of(line) -> Result(String, Nil)`. Check the leading `[` with the string pattern `"[" <> rest`, then split only once at the first `]` with `string.split_once(rest, "]")`. If the line doesn't match the format, it's `Error(Nil)`.
2. **Collecting many lines**: start from an empty dictionary with `list.fold`; on `Ok(level)`, increase the count by 1 with `dict.upsert`, and on `Error`, leave the accumulator as is.

Reducing many values to a single dictionary is a classic use of fold (theory note "The universality of fold: the common skeleton of list recursion"). Because a parse failure is represented as a `Result`, the rule "skip lines that don't match the format" shows up as a single line of `case` inside the `fold`.

There are three common mistakes.

- If you overwrite without looking at the existing count, as in `dict.insert(counts, level, 1)`, every level ends up as 1. `dict.upsert`, which reads the existing value to build the new one, is the right choice.
- If you don't convert to uppercase, `warn` and `WARN` become different keys. You have to normalize the key before counting.
- If you treat the first space-separated word as the level, you miss lines with no space, like `[ERROR]Disk full`. The rule is "up to the first `]`", so the separator must be `]` too.
