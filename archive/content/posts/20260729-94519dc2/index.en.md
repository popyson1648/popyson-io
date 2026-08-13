+++
title = "[Reading Notes] Slide Design for Research Presentations"
date = "2026-07-29"
tags = [ "reading notes", "presentation", "slides", "research presentation" ]
kana = ""

[sumup]
mode = "none"
text = ""

[thumbnail]
mode = "file"
path = "/thumbnails/20260729-94519dc2.png"
generated = true
+++

Slide Design for Research Presentations
https://www.kodansha.co.jp/book/products/0000194774


## Conclusion, Reason, Turn, Conclusion

In practice, looking at the examples, it feels more like: conclusion → reason/supplement → conclusion.

:::note
Example
    
Question: Why haven't you written a single paper this year?
    
Answer:
I don't have time to write papers.
    
Because writing a paper involves many steps. And how much time you can invest in each of those steps determines the final quality. So if you want to write a good paper, you must invest a corresponding amount of time.
    
The reason I haven't written a single paper this year is that I haven't yet been able to secure that much time.
:::

## Write in 6 Lines. Or 6 Paragraphs?

- If you change the premise of a slide, some content becomes cuttable.
    - Premise: restricting the scope, etc.
:::note
Example
        
BAD

Load Balancing Branching Plan

- If a problem occurs → do nothing
- When a problem occurs → do XX

GOOD

Revisiting the Load Balancing Branching Plan for When Problems Occur

- Problem 1 → do XX
- Problem 2 → do YY
:::

## Where to Use Animation

- Guiding the audience's gaze
    - The information visible at any moment is limited
- Unfolding a story within a single slide (like a picture-book)
    - Can they tell what topic is being discussed "right now"?

- Example: for a chart, gradually increase the number of data series (bar chart, line chart, etc.)
- Use animation to explain mechanisms.
    - LLM tokenization, vectorization, etc.
- Mathematical formulas

- One animated slide for every 3–4 slides is about right
    - Adds "pacing" to the presentation

## Make Slide Titles Descriptive (Titles That Communicate)

- Assuming a chart is displayed:
    - Result → "X is showing ~"
    - Comparison of X and Y → "In the case of ~, X is higher"
- Is it better to keep section slides to one slide and use them only at transitions?

---

## About Font Size

- Minimum 20pt, ideally 30pt or more, titles 36pt or more
    - Example: title 44pt, body 36pt

---

- Don't quote things as-is
    - For example, when photos showing a trend over time are lined up:
        - The more there are, the smaller each one gets
        - The audience ends up having to track them with their eyes
        
        → Use just the first and last, or first, middle, and last
        

---

## On Terminology

- "I explained it at the beginning" doesn't cut it. No one will remember.
    - This applies to things other than terms too, like experiment groups.
        - At the end of the experiment section, when you say "so we found that Group A is effective for X," if it's just the label "Group A," the audience will wonder "what was Group A again?"

→ As a rule, avoid abbreviations

- Rephrase things in plain language as you go
- Turn definitions into diagrams
    - The LLM processing pipeline: tokenization, vectorization, inference via neural networks?, context understanding, decoding
        - Make a diagram of this whole flow. Not just a text flowchart.
- When the full name is too long
    - Explain the abbreviation verbally
- Don't bluff
- The ratio of what needs explanation vs. what doesn't
    - Know, Know, Know, Don't know

---

## Figures

- Formulas should be presented alongside figures.
    - Explaining individual terms, etc.
        - Example: lean body mass. Body mass − body fat = lean body mass. (Why Your Presentation Doesn't Land, p. 88)
- Remove items from figures that are irrelevant to the message.
    - Descriptive title → what you want to convey
        - A figure that makes your point convincing

---

## Talking

- State what you want to convey, break down the title and convey it again, show where you're headed
    - At the start of each section, say what you're about to talk about and where you're going
:::note
Example
    
"Safety and Efficacy of X"
    
In this presentation, I hope to share with you that X, a new Y method, is both safe and effective.
    
Case images
    
Today, we performed X and had the experience of Y. Let's look at why Y happened here.
:::

- The introduction should be about 1/3 to 1/4 of the total
- Improve sentences by reading them aloud
    - If they sound roundabout or awkward to say, etc.
    - Break the line, rephrase, etc.
- Make the audience feel it's their problem, feel it's relevant, draw them in
    - Have them raise their hands or take some action
    - Address the audience directly in your remarks (e.g. "everyone," or whatever you call them)
:::note
Example
        
I'm sure many of you have had the experience of breaking into a cold sweat during surgery when you can't find the lesion that needs to be removed. The thing that solves this extremely troubling problem for us is X, which I'll be talking about today.
        
As you all know, X often leads to Y these days. So we try doing A, but the real problem is Z.
        
You might be thinking "why R?", but the answer is S.
        
When Y happens, it's a real headache for us engineers.
        
The thing that solves that problem is what I'm talking about today: XXX.
        
### For a General Audience
        
Some of you may know someone around you who has experienced X. Right now, the most common ~ is X.
        
The ideal is early detection and early treatment, and recently CT scans during health checkups have been able to find tumors smaller than ◯ centimeters in diameter.
        
However, there is a big problem here. Even if a checkup finds an early-stage tumor, it can become impossible to locate that tumor during surgery.
        
In the worst cases, the surgeon decides to let it grow a little more before operating. That defeats the whole purpose of early detection!
        
That's where X, which I'm talking about today, comes in. With this method, lesions can be removed almost certainly, and with nothing extra or missing.
        
### For People Who Have / Haven't Done X  (English presentation)
        
**Have**
        
I think many of you have some experience presenting research in English. How was it? Was it easy? For many people here, the preparation was probably exhausting, the presentation itself felt different from presenting in Japanese, and above all, the Q&A was pure terror.
        
There are many reasons for this. And here's some good news: there are several steps you can take immediately. Today, let's look at everything from quick fixes that would help even if you have an English presentation tomorrow, to strategies you can work on with a long-term view.
        
 **Haven't**
        
Don't you all think that presenting in English yourselves is still a long way off? That makes sense — you need a certain amount of experience before you have a topic worthy of an international conference.
        
But that doesn't mean today's content is too early for you. If anything, hearing this now will be useful in the near future. Conversely, your seniors who never had the chance to hear this kind of talk have almost all struggled greatly with English presentations. There are steps you can take even when an English presentation is right around the corner, but there are limits. If you aim to be a researcher active on the international stage, you should start honing your English presentation skills now.
:::

---

## Table of Contents

If the presentation genre is well known, the flow can be inferred, so write the section content instead.

For example, in a research presentation, the audience already knows it goes background → method → results → conclusion, so don't use that as your agenda items.

→ That said, there are situations where writing it out helps understanding, so maybe listing both isn't a bad idea… (to be considered)

:::note
Example
    
Why Can't You Write Papers?

- Why can't you write? Think through the causes to find solutions
- Timing and tips for writing papers in the cancer field
- It's not over when you write it — completing the long road to publication
:::

## How to Present Data

- Even the same data looks different depending on how you present it. Cook your data.
    - For comparisons: the way you show it changes depending on the formula used. (What you use as the denominator, and which side is the denominator)
:::note
Example
    
Data to show declining birth rates and aging population
    
y: population count, x: time series
    
If both the youth population and the elderly population are increasing in recent years, it lacks persuasive power.
    
"Is it really declining birthrates and aging? Young people are also increasing."
    
In that case, use a ratio.
    
Showing the ratio of the elderly population to the youth population makes the change in the graph more convincing.

:::

## Outlook (Limitation)

In Japanese, this might be called "challenges" (課題)?

- It might be good to use animation to reveal solutions to each limitation
- If there is a plan for improvement, present a milestone. (p. 109)

## Conclusion (Final Slide)

- About two sentences. Around 20 seconds when spoken.
    - Two shorter sentences over one longer one.
- Don't display it for just a moment. It won't stick in the audience's head.
    - Spend more time on this than other parts
- It might be good to put a Summary slide before the Conclusion.
    - Even better if you summarize it into a conceptual diagram!

## Acknowledgments

Skip it. Ending with the Conclusion leaves a stronger impression in the audience's memory.

Besides, the audience isn't interested.

- If you want to credit contributors, introduce them when presenting the material they were involved in. (Photo, text?)

## If You're Short on Time, Cut Content — Don't Speed Up

- There's a lot related to this, but given today's time constraints, I'll talk about just this most important thing
    - Example: "As you can see, there are three techniques, but given our time today, I'll only cover the most important one, X"

## Delivery

Notice your habits — and stop them. Don't fear silence.

- Filler words, verbal tics, etc.
    - They're annoying for the audience, so stop
- Silence is actually good. It gives the audience time to absorb what you said.

Lower your pitch and engage your core.

- It conveys confidence

Don't rush through it

- Add pacing (silence).
    - That's what taking a sip of water is for!
