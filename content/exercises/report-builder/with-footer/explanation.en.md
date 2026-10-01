`parse_all` walks the list once and builds two results together (the valid records and the number of failed lines). So you make the accumulator of `list.fold` the tuple `#(List(Sale), Int)` and split each line into three cases.

- Blank line → return the accumulator unchanged.
- Successful parse → prepend to the list of records.
- Failed parse → add 1 to the failure count.

Prepending to a list (`[sale, ..sales]`) is O(1) but reverses the order, so call `list.reverse` once at the end to restore input order. Forgetting this `reverse` is the most common mistake. If you look only at the total, the order seems not to matter, but when the result of `parse_all` is used elsewhere, a reversed order becomes a bug whose cause is hard to find.

Handling blank lines is the responsibility of `parse_all`, not `parse_line`. `parse_line` only does the job of "interpreting one line", and the side that deals with many lines decides which lines to count. Dividing the roles like this lets you add a new rule without touching `parse_line`, which is already verified.

`build_report` binds the result of `parse_all` to names, sends it down two branches (the category rows and the footer), and joins them with `list.append`. Each step is a function that takes a value and returns a value, so as long as the assembly order is right, the overall result is right too (theory note "Function composition and pipelines").
