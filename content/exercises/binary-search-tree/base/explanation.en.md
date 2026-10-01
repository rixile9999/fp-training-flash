A tree has only two shapes, `Empty` or `Node(data, left, right)`, so a function that works on a tree just splits these two cases with `case` and recurses only into the subtrees (`algebraic-data-types`, `structural-recursion-induction`).

When `insert` reaches an empty spot, it creates a new node; when it meets a node, it compares values and returns a new node with the value inserted into **only one subtree**. The other subtree is not copied but shared as is. Inserting into an immutable tree only creates new nodes along the path you walked down, so the cost is proportional to the tree's height (`immutability-structural-sharing`). The rule is "left if smaller or equal", so the guard is `value <= data`.

`to_tree` folds over the list from the front (`list.fold`) and inserts the elements one at a time. The insertion order decides the tree's shape, so inserting from the back with `list.fold_right` gives a different tree, starting with the root.

`sorted_data` is an in-order traversal (left, self, right). Every value in the left subtree is smaller than or equal to the node, and every value on the right is greater, so this order is exactly ascending order. The solution flattens the right side first and prepends onto an accumulator, so no appending is needed. Writing `list.flatten([left, [data], right])` gives the same result, but on a left-leaning tree the copies made by appending pile up.

Common mistakes are inserting equal values to the right (using only `<`), or skipping a value that is already present and so losing duplicates.
