# Prompt: Improve a website

## Context

The localhost 127.0.0.1:4000/ contains the website for "Maailmantutkija", a 340-page Finnish educational book. The website aims to be a web version of the book, containing sections of the book as individual pages.

The page consists of a landing page, 15 chapters with 3-10 sections per chapter, plus several appendices.

To run populate_website.py, use

python3 populate_website.py --source . --output website_project/

If some issue applies to multiple different pages, always strive to come up with a systematic solution, rather than manual patchwork. Never copy file content manually.

## Task

There are various small applications and additional materials that the website should host. One of these is for the chapter 1.3: Määrien arvioiminen. The ideas is that a computer-generated picture with 1-1000 shapes is shown to the child, and their aim is to estimate how many shapes the image contains.

See Luvut ja laskeminen/Määrien arvioiminen/ for more details.

I want the chapter 1.3 to link to a page that has links to the three PDF files, and also has a link to an interactive web application which generates the number of images and, on click, shows the answer, and, on another click, shows the next picture. The minimum and maximum number of shapes should be modifiable. 

For the interactive web application, you should already find a good base for it in the Määrien arvioiminen/ subdirectory, written in Python. Aim to use it as much as possible, rather than writing the app from scratch.