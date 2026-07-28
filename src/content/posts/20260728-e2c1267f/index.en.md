+++
title = "Amortized Time Complexity"
date = "2026-07-28"
tags = [ "algorithm", "learning", "complexity", "data structures", "programming" ]
kana = ""

[sumup]
mode = "text"
text = "About amortized time complexity"

[thumbnail]
mode = "file"
path = "/thumbnails/20260728-e2c1267f.png"
generated = true
+++

## What Is Amortized Time Complexity

The time complexity per operation, derived by evaluating the total cost across a sequence of operations and distributing that cost among each individual operation.

## Example

This is explained using a dynamic array as an example.

Assumptions:
- A dynamic array with 0 elements and capacity 1 is created initially.
- Elements are appended one at a time, for a total of N appends.
- When capacity is exceeded, it is doubled.
- When expanding, a new array is allocated and all existing elements are copied into it.
- Writing and copying a single element takes O(1) time.
- Allocating a new array takes O(1) time.

Time complexity of each operation:
- Creating the initial array: O(1)
- Writing N elements: O(N)
- Allocating arrays for expansion (once per capacity overflow): O(log N)
- Copying existing elements during expansion (once per capacity overflow): O(N)

The total time complexity of all operations is: O(1) + O(N) + O(N) + O(log N) = O(N)

The total time complexity of all expansion operations across every capacity overflow is: O(N) + O(log N) = O(N)

The total time complexity of all operations is O(N). Dividing by the number of append operations N gives the amortized time complexity: O(N) / N = O(1).

:::note
### Example: Dynamic Array Operation

Current array (capacity: 4): `[a, b, c, d]`

We want to append "e".

Capacity is full, so we expand.

A new array with capacity 4 × 2 = 8 is created.

`[_, _, _, _, _, _, _, _]`

The elements from the old array are copied to the new one.

Copy 1: `[a, _, _, _, _, _, _, _]`

Copy 2: `[a, b, _, _, _, _, _, _]`

Copy 3: `[a, b, c, _, _, _, _, _]`

Copy 4: `[a, b, c, d, _, _, _, _]`

"e" is appended.

`[a, b, c, d, e, _, _, _]`

:::
