---
id: persistent-data-structures
title: Persistent data structures and path copying
---
A data structure whose previous version stays intact and usable after an update is called a **persistent** data structure. If an update destroys the previous version, it is an **ephemeral** data structure.

All values in Gleam are immutable, so any data structure you build in Gleam is automatically persistent. The design question is therefore not "how do I get persistence?" but "how much do I rebuild on each update?"

## Path copying

An update rebuilds **only the nodes on the path** to the place that changes and shares the rest with the previous version. Here it is with a function that replaces the i-th element of a list.

```gleam
pub fn set_at(items: List(a), index: Int, value: a) -> List(a) {
  case items, index {
    [], _ -> []
    [_, ..rest], 0 -> [value, ..rest]
    [first, ..rest], _ -> [first, ..set_at(rest, index - 1, value)]
  }
}
```

The first `index + 1` cells are rebuilt, and the `rest` after the changed cell is shared as is. So changing the first element costs O(1) and changing the last costs O(n). The original list doesn't change at all.

In a tree, the path runs from the root to the node that changes. Below, 5 is inserted into a binary search tree. Only the nodes marked with (') are rebuilt; `10` and `1` are shared by both versions.

```text
  old version     new version
      8                 8'
     / \               / \
    3   10            3'  10
   / \               / \
  1   6             1   6'
                       /
                      5
```

The number of rebuilt nodes is the length of the path from the root to the change, so at most about the height of the tree. In a balanced tree, one update is O(log n) in both time and memory; in a lopsided tree, it's O(n). That's why the heart of persistent data structure design is **an invariant that keeps the height low**.

## Invariants keep paths short: the leftist heap

A leftist heap is a priority queue that takes out the smallest value quickly. It maintains two invariants.

- **Heap order**: a parent's value is never greater than its children's. So the smallest value is at the root.
- **Leftist property**: call the length of a node's right spine (the path you get by following only right children to the end) its **rank**. A left child's rank is never smaller than its right child's.

Because of the second invariant, the right spine is the shortest path to an empty spot, and a heap of rank r has at least 2ʳ - 1 nodes. So in a heap with n nodes, the right spine has length at most log₂(n + 1). Merging two heaps walks down only the right spines of the two heaps, so it is O(log n), and it rebuilds only that path. Insertion is expressed as merging with a one-node heap, and removing the minimum as merging the root's two children. If you leave out the step that compares ranks after merging and swaps the two children, the invariant breaks and the spine grows long.

## Zippers: when you edit one spot repeatedly

If you edit near the same position many times, you pay to copy the path from the root every time. A **zipper** stores the current position (the focus) together with "the way back" (the context), making it O(1) to move the focus or change the value at the focus. The whole structure is reassembled on the way back up. Here is a list zipper. The elements before the focus are stored reversed, so the nearest one comes first.

```gleam
pub type ListZipper(a) {
  ListZipper(before: List(a), focus: a, after: List(a))
}

pub fn next(zipper: ListZipper(a)) -> Result(ListZipper(a), Nil) {
  case zipper.after {
    [] -> Error(Nil)
    [first, ..rest] ->
      Ok(ListZipper([zipper.focus, ..zipper.before], first, rest))
  }
}

pub fn set_focus(zipper: ListZipper(a), value: a) -> ListZipper(a) {
  ListZipper(..zipper, focus: value)
}
```

A tree zipper differs only in that its context stacks up "which child you went down into, and the sibling subtree you left behind at that point".

## What persistence gives you, and what to watch for

- **History and undo**: just keep the old version. No copying needed.
- **Backtracking**: when you pass a new version to a recursive call, the caller's version stays as it was.
- **Memory**: two versions share most of their structure, so the extra memory is only the changed path.
- **Caution**: amortized cost guarantees can break if old versions are reused repeatedly. Structures with a guaranteed worst-case cost per operation (such as the leftist heap's O(log n) merge) don't have this problem.

## Where this concept is used

- Priority queues (leftist heaps), tree editing (zippers), edit history and undo.
- `Dict` and `Set` are persistent data structures too. `insert` returns a new version, and the previous version remains usable.
