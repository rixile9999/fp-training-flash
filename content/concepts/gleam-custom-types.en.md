---
id: gleam-custom-types
title: Custom types
---
A custom type states, in the type itself, that "this value is **exactly one** of these shapes". Each shape (variant) is a
constructor, and it can have fields.

| Syntax | Example | Meaning |
|---|---|---|
| Several variants | `type Grade { Basic Vip }` | One of the two |
| Record (labelled fields) | `Customer(name: String, grade: Grade)` | A bundle of named fields |
| Reading a field | `customer.name` | You can read a field with `.` when the type has only one variant, or when every variant has that field with the same label and type |
| Destructuring with a pattern | `Points(amount:)` | Pulls a field out into a variable of the same name |
| Ignoring fields | `Card(..)` | Checks only the variant and ignores its fields |
| Visibility | `pub type`, `pub opaque type` | With opaque, code outside the module can't use the constructors, patterns or fields |

```gleam
pub type Payment {
  Card(number: String)
  Cash
  Points(amount: Int)
}

pub fn fee(payment: Payment) -> Int {
  case payment {
    Card(..) -> 300
    Cash -> 0
    Points(amount:) -> amount / 100
  }
}
// fee(Points(1500)) == 15

pub type Grade {
  Basic
  Vip
}

pub type Customer {
  Customer(name: String, grade: Grade)
}

pub fn greeting(customer: Customer) -> String {
  case customer.grade {
    Vip -> customer.name <> ", your VIP perks have arrived"
    Basic -> customer.name <> ", welcome back"
  }
}
// greeting(Customer(name: "Minji", grade: Vip)) == "Minji, your VIP perks have arrived"
```

If you split states into variants instead of flagging them with a `Bool` or a `String`, impossible combinations can't be built at all,
and the compiler tells you when a `case` misses one.

Common mistake: lumping all the remaining cases together with `_ ->` in a `case`. If you add a variant later, the compiler can't point
out the missing handling, so whenever you can, list every variant one by one.
