---
id: separating-effects
title: 分离计算与效应
---
程序终究要与外部世界交互：向屏幕输出、读取文件、查看当前时间、向其他进程发送消息。这些事情叫作**效应**（effect）。效应本身并不坏，问题出在它混进计算中间的时候。

Gleam 不在类型中标记效应。只看 `fn(List(Item)) -> Nil` 这个签名，无法知道函数会输出什么，测试也只能检查返回值 `Nil`。所以分离要靠代码的**结构**来完成。

- **纯粹的核心**：决定要做什么，并把这个决定作为**数据**返回。要输出的行、要保存的记录、要发送的消息，都构造成值。
- **薄薄的外壳**：接收核心给出的数据，执行实际的效应。几乎没有分支或计算。

```gleam
import gleam/int
import gleam/io
import gleam/list

pub type Item {
  Item(name: String, stock: Int)
}

pub fn low_stock_warnings(items: List(Item), threshold: Int) -> List(String) {
  items
  |> list.filter(fn(item) { item.stock < threshold })
  |> list.map(fn(item) {
    item.name <> "库存 " <> int.to_string(item.stock) <> " 个"
  })
}

pub fn report(items: List(Item)) -> Nil {
  low_stock_warnings(items, 5)
  |> list.each(io.println)
}
```

`low_stock_warnings` 是纯的，所以像 `should.equal(["苹果库存 3 个"])` 这样直接比较结果来测试。关于阈值、文案、顺序的所有规则都在这里。`report` 只是两行连接代码，几乎没有出错的余地。

## 输入一侧的效应也移到外面

当前时间、随机数、配置文件内容这类**读取**的效应也一样。不要在计算函数里直接读取时间，而要作为参数接收。`is_expired(coupon, now)` 可以用任意时间来测试，而在内部读取时间的 `is_expired(coupon)` 每次运行的结果都可能不同。

## 为什么要这样拆分

- **测试**：核心通过比较值来验证，每次运行结果都相同。
- **复用**：同一份警告列表可以输出到控制台、写入文件，或作为响应体发送，核心都不用改。
- **推理**：核心里的函数是引用透明的，可以自由拆分和组合（参见“引用透明性”）。

常见的错误有：在计算过程中调用 `io.println`；不返回结果只返回 `Nil`，导致无法确认做了什么；以及在核心深处直接读取时间或配置。

## 这个概念用在哪里

- 把日志、报表、通知这类需要输出的功能，拆成“构造输出内容的函数”和“负责输出的函数”时。
- 把依赖时间、随机数、配置的规则改为通过参数接收，使其可测试时。
- 把混有效应的长函数分解为纯步骤和效应步骤的重构中。
