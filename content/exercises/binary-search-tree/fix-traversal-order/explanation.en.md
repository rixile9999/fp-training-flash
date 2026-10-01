`to_tree`, which builds the tree, is correct; the problem is the order in which the tree is flattened into a list. The original `walk` puts the node's own value first and then joins left and right. That is a **pre-order traversal**, so the tree built from `[2, 1, 3]` (root 2, left 1, right 3) flattens to `[2, 1, 3]`.

The invariant of a binary search tree is "values in the left subtree ≤ node value < values in the right subtree". So an **in-order traversal**, which lists everything on the left, then the node's own value, then everything on the right, is exactly ascending order. Each subtree has the same property, so joining the recursively sorted pieces in this order sorts the whole tree. This is structural induction: a property that holds for smaller trees carries up unchanged to bigger trees (`structural-recursion-induction`).

Common fixes that do not work are moving the node's own value to the end (post-order traversal) and visiting the right side first (descending order). If you draw a three-element tree and check the visiting order by hand, you can see right away which order is correct.

Joining with `list.flatten` is easy to read, but on a lopsided tree the copies pile up. A more efficient approach is to flatten the right side first and prepend onto an accumulator (`accumulators-and-tail-recursion`).
