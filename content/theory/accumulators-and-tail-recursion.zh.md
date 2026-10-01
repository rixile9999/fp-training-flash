---
id: accumulators-and-tail-recursion
title: 累加器与尾递归
---
递归函数构造结果的方式有两种。

- **体递归**（body recursion）：递归调用返回**之后**还有工作要做。`first + sum(rest)` 要等调用结果回来才能做加法。
- **尾递归**：递归调用是函数做的**最后一件事**。没有剩余的计算，所以直接返回调用结果。

要把体递归改成尾递归，就得把“目前为止的结果”作为参数一路带下去。这个参数叫作累加器（accumulator）。

```gleam
// 体递归：加法要等递归调用结束
pub fn sum(numbers: List(Int)) -> Int {
  case numbers {
    [] -> 0
    [first, ..rest] -> first + sum(rest)
  }
}

// 尾递归：把部分和累积到 total 里往下传。初始值由公开函数决定
pub fn sum_with_acc(numbers: List(Int)) -> Int {
  sum_loop(numbers, 0)
}

fn sum_loop(numbers: List(Int), total: Int) -> Int {
  case numbers {
    [] -> total
    [first, ..rest] -> sum_loop(rest, total + first)
  }
}
```

调用方不需要关心累加器，所以通常拆成两个函数：一个公开函数负责传入初始值，一个私有函数负责真正的循环。

## 累加器的不变式

要检查累加器函数是否正确，可以试着用一句话写出“累加器里装的是什么”。`sum_loop(rest, total)` 的不变式是 **total +（rest 的和）= 原列表的和**。

- 开始：`total` 是 0，`rest` 是整个列表，所以成立。
- 每一步：从 `rest` 取下 `first` 加到 `total` 上，等式两边保持不变。
- 结束：`rest` 为 `[]` 时，`total` 就是答案。

初始值要选得让不变式从一开始就成立：求和用 0，求积用 1，列表用 `[]`。初始值选错，所有结果都会出错。求和的初始值设为 1，每个结果都会多 1；求积的初始值设为 0，每个结果都会变成 0。

## 累积列表会让顺序反过来

往累加器里堆列表时，要加在前面（`[x, ..acc]`，O(1)）。这样结果会是输入的逆序，所以最后调用一次 `list.reverse`（O(n)）。累加器也可以有多个。下面的函数同时带着累计和与结果列表。

```gleam
import gleam/list

/// [3, 1, 4] -> [3, 4, 8]
pub fn running_totals(numbers: List(Int)) -> List(Int) {
  running_loop(numbers, 0, [])
}

fn running_loop(numbers: List(Int), total: Int, acc: List(Int)) -> List(Int) {
  case numbers {
    [] -> list.reverse(acc)
    [first, ..rest] -> {
      let total = total + first
      running_loop(rest, total, [total, ..acc])
    }
  }
}
```

常见的错误是为了保持顺序，每一步都用 `list.append(acc, [x])` 加到末尾。结果是对的，但 `append` 每次都要复制整个 `acc`，总代价变成 O(n²)。忘记反转也很常见：如果测试只检查单元素列表，就发现不了。

## 尾递归在 BEAM 上能带来什么、不能带来什么

BEAM 执行尾调用时不会新建栈帧（last call optimization，尾调用优化）。所以尾递归函数无论循环多少次，栈都不会增长。体递归则按调用深度占用栈。不过 BEAM 进程的栈会按需增长，不像栈大小固定的环境那样，深度到几万就立刻溢出，只是会占用与深度成正比的内存。

因此在 BEAM 上，“尾递归总是更快”这种说法并不成立。对于构造列表的函数，体递归直接按正确顺序生成结果，尾递归则要先累积再反转一次。两者的速度和内存占用通常差不多，Erlang 效率指南也专门讨论过这个误解。

确实需要尾递归的情况有：

- 永不结束或运行很久的循环（服务器循环、状态机）。如果用体递归，内存会随循环次数不断累积。
- 在内存上限固定的环境里处理非常长的输入。
- 结果是和、个数、最大值这样的单个值。累加器版本只用常量内存就能完成，也不需要反转。

`list.fold(numbers, 0, fn(total, x) { total + x })` 就是把这种累加器循环做成了一个有名字的函数。只需给出初始值和每一步的更新。

## 这个概念用在哪里

- 把列表归约成单个值时。手写的累加器循环和 `list.fold` 形状相同。
- 把结果列表加在前面累积，最后反转一次。
- 同时追踪多种状态（如前一个值与当前值、总和与个数）时，使用多个累加器。
- 把用 `append` 反转这类 O(n²) 的递归改成线性时间。
