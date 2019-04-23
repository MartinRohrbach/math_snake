
// default values
let n = 6;
let m = 6;
let maxNumber = 100;
let operations = ['+', '-', '/', '/', '*', '*'];
let allowDivideBySelf = 0; 
let allowDuplicates = 0; // same calc twice
let allowComplimentaryDuplicates = 0;  // same calcs and also the complimentary (3 * 4 == 4 * 3)
let restrictMultiplicationTable = 100;
let seed = '';
let rnd;

// helpers
let debug = 0;
let values = [];
let transitions = '';
let calcDone = '';

let complimentaryOperation = [];
complimentaryOperation['*'] = '/';
complimentaryOperation['/'] = '*';
complimentaryOperation['+'] = '-';
complimentaryOperation['-'] = '+';

function genNumber(max) {
    return Math.floor(rnd() * max);
}

function matheSchnecke() {
    // reset
    document.getElementById("schnecke").innerHTML = '';

    // transfer defaults from form
    try { n = document.getElementById("rows").value; } catch {};
    try { m = document.getElementById("columns").value; } catch {};
    try { maxNumber = document.getElementById("max_number").value; } catch {};
    try { operations = document.getElementById("operations").value.split(""); } catch {};
    try { restrictMultiplicationTable = document.getElementById("restrict_multi").value; } catch {};
    try { seed = ''; seed = document.getElementById("seed").value; } catch {};

    // generate a new seed if we don't have one
    if (seed == '') {
        seed = Math.random().toString(36).replace(/[^a-z]+/g, '').substr(0, 8);
    }
    rnd = new alea(seed);

    // init
    for (let i = 0; i < n; i++) {
        values[i] = [];
        for (let j = 0; j < m; j++) {
            values[i][j] = '';
        }
    }
    transitions = new Map();
    calcDone = new Map();

    // get the first coordinate
    let firstX = genNumber(n);
    let firstY = genNumber(m);
    console.log('x ' + firstX + ' y ' + firstY);
    let firstValue = genNumber(((maxNumber > restrictMultiplicationTable) ? restrictMultiplicationTable : maxNumber)) + 1; // do not start with 0 but maxValue is ok
    values[firstX][firstY] = {value:firstValue,start:true};

    buildSchnecke(firstX, firstY, firstValue);
    renderSchnecke();
}

function buildSchnecke(startX, startY, currentValue, currentOperations = operations) {
    console.log("buildSchnecke(" + startX + ","+ startY + "," + currentValue + ")");

    if (currentOperations.length == 0) {
        return;
    }

    // find a free neighboring field
    let freeNeighbors = [];
    if (startX >= 1 && values[startX - 1][startY] == '') { 
        freeNeighbors.push({x:startX-1, y:startY, direction:'&#8593;'}); // oben
    }
    if (startX < (n-1) && values[startX + 1][startY] == '') { 
        freeNeighbors.push({x:startX+1,y:startY, direction:'&#8595;'}); // unten
    }
    if (startY >= 1 && values[startX][startY-1] == '') { 
        freeNeighbors.push({x:startX, y:startY-1, direction:'&#8592;&#9135;'}); // links
    }
    if (startY < (m-1) && values[startX][startY+1] == '') { 
        freeNeighbors.push({x:startX,y:startY+1, direction:'&#9135;&#8594;'}); // rechts
    }
    console.log(freeNeighbors);
    if (freeNeighbors.length == 0) {
        return;
    }
    let neighborSelect = genNumber(freeNeighbors.length);
    let neighbor = freeNeighbors[neighborSelect];

    // select an operation
    let opSelect = genNumber(currentOperations.length);
    let operation = currentOperations[opSelect];
    console.log("Operation : " + operation);

    // certain operations don't make sense in certain areas
    if (operation == '*' && (currentValue > (maxNumber / 2) || currentValue == 0)) {
        currentOperations = currentOperations.filter(op => op != '*');
        return buildSchnecke(startX, startY, currentValue, currentOperations);
    }
    if (operation == '+' && currentValue == maxNumber) {
        currentOperations = currentOperations.filter(op => op != '+');
        return buildSchnecke(startX, startY, currentValue, currentOperations);
    }

    // select a target number, we brute force by simply grabbing all possible values
    let possibleTargets = [];
    for (let i = 0; i <= maxNumber; i++) {
        let result = eval(currentValue + " " + operation + " " + i);
        if (
            result >= 0 
            && result <= maxNumber 
            && result != currentValue 
            && (result == Math.floor(result))
            && (operation != '*' || i != 0) // no * by 0
            && (operation != '*' || i != 1) // no * by 1
            && (operation != '/' || i != 1) // no / by 1
            && (result != 0) // we get a lot of x - x = 0 otherwise
            && (operation != '/' || (i != currentValue) || allowDivideBySelf) // no / by itself
            && (!calcDone.has(currentValue + '_' + operation + '_' + i)) // no duplicates
            && (// adhere to the multiplication table, two of the operands must be ok
                (operation != '*' && operation != '/') 
                || (result <= restrictMultiplicationTable && i <= restrictMultiplicationTable)
                || (currentValue <= restrictMultiplicationTable && i <= restrictMultiplicationTable)
                || (currentValue <= restrictMultiplicationTable && result <= restrictMultiplicationTable)
                ) 
            ) 
        {
            possibleTargets.push({param:i,result:result});
        }
    }
    if (possibleTargets.length == 0) {
        console.log("Found no possible target for " + currentValue + " " + operation);
        currentOperations = currentOperations.filter(op => op != operation);
        return buildSchnecke(startX, startY, currentValue, currentOperations);
    }
    let targetSelect = genNumber(possibleTargets.length)
    let target = possibleTargets[targetSelect];
    console.log(possibleTargets);

    // save and go on
    console.log("Selected " + currentValue + " " + operation + " " + target.param + " = " + target.result);
    let transitionKey = buildTransitionKey(startX, startY, neighbor.x, neighbor.y);
    transitions.set(transitionKey, { direction:neighbor.direction, operation:operation, param: target.param });
    values[neighbor.x][neighbor.y] = {value:target.result,start:false}; 
    if (!allowDuplicates) {
        calcDone.set(currentValue + '_' + operation + '_' + target.param, 'done');
        if (!allowComplimentaryDuplicates) {
            calcDone.set(target.result + '_' + complimentaryOperation[operation] + '_' + target.param, 'done');
        }
    }
    buildSchnecke(neighbor.x, neighbor.y, target.result);
    buildSchnecke(startX, startY, currentValue);
}

function buildTransitionKey(x1, y1, x2, y2) {
    if (x2 > x1) {
        return x2 + '_' + y2 + '_' + x1 + '_' + y1;
    } else if (y2 > y1) {
        return x2 + '_' + y2 + '_' + x1 + '_' + y1;
    } else {
        return x1 + '_' + y1 + '_' + x2 + '_' + y2;
    }
}

function toggle (elements) {
    elements = elements.length ? elements : [elements];
    for (var index = 0; index < elements.length; index++) {
        if (elements[index].style.display == 'block') {
            elements[index].style.display = 'none';
        } else {
            elements[index].style.display = 'block';
        }
    }
}

function renderSchnecke() {
    console.log(transitions);
    let content = '<style type="text/css">table { border-collapse: collapse; } ';
    content = content + 'td { border: 0px solid Gray; } td.cellborder { border:2px solid Black; width: 50px; height: 50px } ';
    content = content + 'td.start { border:4px solid Black; } ';
    content = content + '.solution { display:none; } '
    content = content + ' </style>'
    content = content + '<table>';
    for (let i = 0; i < n; i++) {
        content = content + '<tr>';
        for (let j = 0; j < m; j++) {
            // the value line
            let cellclass = (values[i][j].start ? "start" : "cellborder");
            let cellvalue = '';
            if (debug) {
                cellvalue = values[i][j].value + ' (' + i + '/' + j + ')';
            } else {
                cellvalue = (values[i][j].start ? values[i][j].value : ('<div class="solution">' + values[i][j].value + "</div>"));
                if (values[i][j].value == undefined) { cellvalue = "XXX"; }
            }
            
            content = content + '<td align="center" class="' + cellclass + '">' + cellvalue + '</td>';
            if (j < (m-1)) {
                let transitionKey = buildTransitionKey(i,j,i,j+1);
                opContent = '';
                if (transitions.has(transitionKey)) {
                    let transition = transitions.get(transitionKey);
                    opContent = transition.operation + "<br>" + transition.direction + "<br>" + transition.param;
                }
                content = content + '<td align="center">' + opContent + '</td>';
            }
        }
        content = content + '</tr><tr>';
        // the operations line
        for (let j = 0; j < m; j++) {
            let transitionKey = buildTransitionKey(i,j,i+1,j);
            opContent = '';
            if (transitions.has(transitionKey)) {
                let transition = transitions.get(transitionKey);
                opContent = transition.operation + " " + transition.direction + " " + transition.param;
            }
            content = content + '<td align="center">' + opContent + '</td><td></td>';
        }
        content = content + '</tr>';
    }
    content = content + '<th><tr><td colspan="' + (2*m-1) + '"><center><font size="-2">';
    content = content + n + 'x' + m + ', max ' + maxNumber + ', ops "' + operations.join('');
    content = content + '", max mul ' + restrictMultiplicationTable + ', seed: ' + seed + ', generated on ' + new Date();
    content = content + '</font></center>';
    content = content + '</table>';
    document.getElementById("schnecke").innerHTML = content;
}

function matheSchneckeHelp() {
    alert(
'Help!\n\
\n\
Generate a random configurable math snake, you can configure it as follows:\n\
- Select a preset OR\n\
- Configure a grid with n rows and m columns\n\
- Select the max number for any result or operator (0 inclusive)\n\
- Select the operations allowed from +, -, * and /\n\
- Repeat operations to make them more prominent\n\
  (i.e. "+++-" means + is three times as likely as -)\n\
- Additionally you can seperately restrict operand/result combination\n\
  for multiplication and division, e.g. to stick to the german "1x1"\n\
- And finally you can recreate any table by using the same "seed"\n\
  which you can find on the bottom of the generated snake\n\
\n\
Note that the menu is automaticlaly hidden when you print the page.\n\
\n\
(martin@clogging.de)\n\
'
    );
}