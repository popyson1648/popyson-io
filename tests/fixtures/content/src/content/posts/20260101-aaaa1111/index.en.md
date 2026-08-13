+++
title = "Scanning an array"
date = "2026-01-01"
tags = [ "algorithms", "complexity" ]
kana = ""

[sumup]
mode = "text"
text = "Counting the work in a single pass over an array."

[thumbnail]
mode = "file"
path = "/thumbnails/20260101-aaaa1111.png"
generated = true
+++

## The cost of one pass

Reading every element of an array of n elements once takes a number of
comparisons proportional to n.

Moving an index back and forth keeps that shape as long as each element is
touched a constant number of times.

## Checking it

Counting operations over arrays of different lengths shows the growth tracking
the element count.
