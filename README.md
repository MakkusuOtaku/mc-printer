# Minecraft Printer
Minecraft Bot that prints images with blocks.

![](https://raw.githubusercontent.com/MakkusuOtaku/mc-printer/main/examples/shrek.png)

```
draw image.png concrete+terracotta 64x64
```


### Commands

```
**chunk** 4
```
Sets the number of simultaneous blocks to place per tick to 4. Higher numbers are generally faster but might be bad for your computer.

```
**clear**
```
Clears the logs in the console.

```
**color** average
```
Use the average color of blocks for "calculations". You can also set it to "dominant". 

```
**commands** on
```
Makes the bot use commands to place blocks. Can also be "off" to make the bot place them by hand.

```
**draw** image.png all 640x360
```
Makes the bot build image.png with a size of 640x360 out of any available blocks. If only one dimension is specified it'll be treated as the width and height will be inferred from the images original aspect ratio.

```
**join** localhost 12345
```
Attempts to join server "localhost" on port "12345". If you only provide a port it'll try to join localhost.

```
**mode** rgb
```
Measures the difference between colors using RGB. You can also use LAB.

```
**rejoin**
```
Attempt to rejoin the last server.