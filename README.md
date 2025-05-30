# Another Data Populator

A Figma plugin that populates your designs with JSON.

## How it works

1. Create a Layer Group that contains at least one Text Layer. In the Text Layer content, use placeholders for you data fields in double curly brackets – such as `{{firstname}}` or `{{lastname}}`. The plugin will replace all these placeholders with respective data. _Please note that if your Text Layer is called `{{name}}` (in the Layer List), the content of the Layer will always be overwritten with the data contained in {{name}}. So if you use multiple {{placeholders}} in a Text Layer, you should rename your Layer to something without curly brackets._

2. In the same Layer Group, create a Shape Layer (this is your image placeholder). Give the Shape Layer a placeholder name in double curly brackets – such as `{{image}}`. The plugin will replace this placeholder with respective image data (PNG or JPG).

3. For JSON arrays, create a Layer Group with a placeholder name like `{{items}}`. That group must contain one child Group Layer with the name `{{template}}`. This is the group that will be cloned and populated with the JSON array data. This works recursively with nested data. The array placeholder can have an optinal limit filter `{{items | limit 5}}`, which will limit the number of `{{template}}` clones.

## Available Commands

### Populate with Dummy JSON
The plugin includes presets from [https://dummyjson.com/](https://dummyjson.com/) including:

- Products
- Carts
- Recipes
- Users
- Posts
- Comments
- Todos
- Quotes

### Populate with Imported JSON
You can also upload any JSON file from your machine.

## Filters
By appending your {{placeholder}} with one of the following available filters, separated by a `|`, you can use certain operations on your populated strings.

### 1. Maximum characters
You can set the maximum number of characters of your {{placeholder}} by appending it with `| max n`, 'n' representing the desired number of characters.

`{{name | max 3}}`

### 2. Date
Display {{placeholder}} in MM/DD/YYYY format.

`{{dateTimeString | date}}`

## Conditional Actions
A Conditional Action performs a certain action on a Layer Group or Component based on data and a conditional expression. The Conditional Action is controlled by the name of the Layer Group (or Component).

### 1. `#show[condition]`  
shows layer if true and hides otherwise

### 2. `#hide[condition]`  
hides layer if true and shows otherwise

### 2. `#duplicate[condition]`  
duplicate layer n times

### 3. `#variant[condition, component property]`  
set component property based on condition

### Examples
`#show[{{firstname}}.length > 3]`  
shows layer if {{firstname}} has more than 3 characters and hides otherwise

`#show[{{firstname}} == "Peter"]`  
shows layer if {{firstname}} is 'Peter' and hides otherwise 

`#duplicate[{{rating}}]`  
duplicates the layer by the value of {{rating}}

`#variant[{{completed}}, Value Type = Checked]`  
sets the component property "Value Type" to "Checked" if {{completed}} is true

##### You can combine several conditions:

`#show[{{firstname}}.includes('e') || {{firstname}}.length > 3]`  
shows layer if {{firstname}} includes 'e' or has more than 3 characters, hides otherwise  

##### Or several Conditional Actions:

`#variant[{{completed}}, Value Type = Checked] #variant[{{completed}}, State = Completed]`
sets the component properties "Value Type" to "Checked" and "State" to "Completed" if {{completed}} is true

Pure _JavaScript_ syntax is being used for _Conditional Actions_, so you can basically use anything available in _JavaScript_.