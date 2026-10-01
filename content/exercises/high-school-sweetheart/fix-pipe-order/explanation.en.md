The cause of the bug is the **order of the pipeline steps**. The original code flows `"Betty"` → `"Betty."` → `"BETTY."` → `"B"`, so the final `first_letter` cuts off the period added earlier. Every function used is correct; only the order is wrong.

The correct order is "pick out one letter → uppercase it → add a period". Put the step that shortens the result (`first_letter`) first, and the steps that decorate that result after it. In a pipeline, the top-to-bottom reading order is the execution order, so writing down the intermediate value at each step makes bugs like this easy to find.

There are two common mistakes when fixing it.

- If you leave out `string.uppercase`, the initial of `"james"` becomes `"j."`.
- If you drop `first_letter` and cut the string yourself with `string.slice(0, 1)`, a space in `"  zoe "` is mistaken for the initial. Reusing the already-verified `first_letter` means you don't have to write the whitespace rule again.

Because each step is a pure function, you can compute and check intermediate values separately, which makes debugging easy. In the theory note "Function composition and pipelines", you can see more about how the order of composition changes the result.
