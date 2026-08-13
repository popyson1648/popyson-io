+++
# title      Work name. Required, must not be empty
# tagline    One line shown on the index card and under the detail heading
# summary    Description shown on the index card
#
# year, stack, thumbnail and hero are taken from index.ja.md.

title = "LineWatch"
tagline = "Observe logs as lines"
summary = "A lightweight observability dashboard that draws logs and metrics as minimal line art — anomalies shown by shape, not color."
+++

LineWatch turns the idea of quiet observability into a tool. Instead of noisy alerts it draws deviation from baseline as subtle distortions in thin lines.

A Rust collector with a lightweight Canvas frontend renders tens of thousands of events per second in a single pane.
