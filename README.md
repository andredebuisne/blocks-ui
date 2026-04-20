# Blocks UI

## A ligthweight UI framework to visualize data

![ui.png](ui.png)

## Installation
1. CDN installation:

Add this line in your `<head>`
```html
<link rel="stylesheet" href="https://cdn.hudsonshipping.co/blocks.min.css"
```

2. Download the `blocks.min.css` locally and import it directly:
```html
<link rel="stylesheet" href="./path_to_static/blocks.min.css"
```

## Motivation
There is simply no library today that is a light CSS/JS library that can help with
the visualization of data. There are many frameworks today that can display
beautiful dashboards, but they are either bloated, slow or simply not data specific.

`Blocks UI` allows you to display your data is different blocks. Each block has:
- A title
- A subtitle (optional)
- Tabs (optional)
- A body
- A footer (optional)

A block body can contain:
- Another block
- Text
- A chart
- A number
- Plain HTML
