# fp-restful-api
Scaffolding for a robust and easily extendable rest-api.


EBNF

```
QUERY  ::= QUERY_NORMAL || QUERY_AGGREGATE

FILTER ::= 'find all entries' || 'find entries whose ' + (CRITERIA || (CRITERIA + ((' and ' || ' or ') + CRITERIA)*)

QUERY_NORMAL ::= DATASET + ', ' + FILTER + '; ' + DISPLAY(+ '; ' + ORDER)? + '.'
DATASET      ::= 'In ' + KIND + ' dataset ' + INPUT
DISPLAY      ::= 'show ' + KEY (+ MORE_KEYS)?
ORDER        ::= 'sort in ' + ('ascending ' || 'descending ')? + 'order by ' + KEY (+ MORE_KEYS)?

QUERY_AGGREGATE ::= DATASET_GROUPED + ', ' + FILTER + '; ' + DISPLAY_GROUPED(+ '; ' + ORDER_GROUPED)? + '.'
DATASET_GROUPED ::= DATASET + ' grouped by ' + KEY (+ MORE_KEYS)?
DISPLAY_GROUPED ::= 'show ' + KEY_C (+ MORE_KEYS_C)? + (', ' + AGGREGATION)?  
ORDER_GROUPED   ::= 'sort in ' + ('ascending ' || 'descending ')? + 'order by ' + KEY_C (+ MORE_KEYS_C)?
AGGREGATION     ::= 'where ' + AGG_DEF (+ MORE_DEFS)*

AGG_DEF    ::= INPUT + ' is the ' + AGGREGATOR + ' of ' + KEY
MORE_RULES ::= ((', ' + AGG_DEF +)* ' and ' + AGG_DEF)
AGGREGATOR ::= 'MAX' || 'MIN' || 'AVG' || 'SUM'

CRITERIA   ::= M_CRITERIA || S_CRITERIA
M_CRITERIA ::= M_KEY + M_OP + NUMBER
S_CRITERIA ::= S_KEY + S_OP + STRING

NUMBER   ::= ('-')? + [0-9] (+ [0-9])* + ('.' + [0-9] (+ [0-9])*)?

STRING   ::= '"' + [^*"]* + '"' // any string without * or " in it, enclosed by double quotation marks

RESERVED ::= KEYWORD || M_OP || S_OP || AGGREGATOR
KEYWORD  ::= 'in' || 'dataset' || 'find' || 'all' || 'show' || 'and' || 'or' || 'sort' || 'by' || 'entries' || 'grouped' || 'where' || 'is' || 'the' || 'of' || 'whose'
M_OP     ::= 'is ' + ('not ' +)? ('greater than ' || 'less than ' || 'equal to ')
S_OP     ::= ('is ' (+ 'not ')?) || 'includes ' || 'does not include ' || (('begins' || 'does not begin' || 'ends' || 'does not end') + ' with ')

KIND     ::= 'courses' || 'rooms'

INPUT    ::= string of one or more characters. Cannot contain spaces, underscores or equal to RESERVED strings

KEY   ::= M_KEY || S_KEY
KEY_C ::= KEY || INPUT
MORE_KEYS   ::= ((', ' + KEY +)* ' and ' + KEY)
MORE_KEYS_C ::= ((', ' + KEY_C +)* ' and ' + KEY_C) 
M_KEY ::= 'Average' || 'Pass' || 'Fail' || 'Audit' || 'Latitude' || 'Longitude' || 'Seats' || 'Year'
S_KEY ::= 'Department' || 'ID' || 'Instructor' || 'Title' || 'UUID' || 'Full Name' || 'Short Name' || 'Number' || 'Name' || 'Address' || 'Type' || 'Furniture' || 'Link'
```
