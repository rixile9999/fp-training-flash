This is a variation on the base exercise that collects lists of messages instead of counts. Split out the interpretation of one line as `parse_line(line) -> Result(#(level, message), Nil)`, and collect many lines into a dictionary with `list.fold`.

Order is the key. With Gleam lists, adding to the front with `[message, ..messages]` is cheap, while adding to the end with `list.append` costs as much as the list is long. So collect by adding to the front, and once everything is collected, reverse each list **once** with `dict.map_values`. If you don't reverse, messages of the same level come out backwards. Watch out for `list.group` too: for the same reason, its value lists come out reversed.

The message is the second part of `string.split_once(rest, "]")`. `split_once` splits only once, at the first `]`, so a `]` inside the message stays. If you split at every `]` with `string.split` and use only the second piece, the part after the `]` in `items[0] = 3, ...` gets cut off. The rule says to remove only leading whitespace, so use `string.trim_start`, not `string.trim`.

How the direction of accumulation relates to the order of the result is something to check every time you use a fold (theory note "The universality of fold: the common skeleton of list recursion").
