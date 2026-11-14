ALTER TABLE public.ingredient_translations DROP CONSTRAINT ingredient_translations_locale_check;
ALTER TABLE public.ingredient_translations ADD CONSTRAINT ingredient_translations_locale_check CHECK (locale IN ('de-AT','de-DE','en','it','es'));
INSERT INTO public.recipes(id,title,description,prep_minutes,base_servings,diet_tags,allergens,main_ingredient,steps,image_url)
SELECT ('60000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,title,description,minutes,4,tags,allergens,main,jsonb_build_array(jsonb_build_object('text',prep),jsonb_build_object('text',cook,'timer_minutes',timer),jsonb_build_object('text',finish)),NULL FROM (VALUES
(1,'Paprikahendl','Hendl in cremiger Paprikasauce mit Reis.',40,ARRAY[]::text[],ARRAY['Milch/Laktose'],'huhn','Zwiebeln würfeln, Hühnerkeulen trocken tupfen. Reis mit der doppelten Menge Wasser aufsetzen.','Hendl in Öl anbraten. Zwiebeln und Paprikapulver zugeben, mit 300 ml Wasser aufgießen und zugedeckt garen.',30,'Sauerrahm einrühren, mit Salz abschmecken und mit dem Reis servieren.'),
(2,'Erdäpfelgulasch','Wärmendes veganes Gulasch mit Erdäpfeln.',35,ARRAY['vegan'],ARRAY[]::text[],'erdapfel','Erdäpfel schälen und würfeln, Zwiebeln fein schneiden.','Zwiebeln in Öl anschwitzen, Paprikapulver kurz zugeben. Erdäpfel und 700 ml Wasser zufügen und köcheln lassen.',25,'Mit Majoran, Salz und Pfeffer abschmecken.'),
(3,'Spinatknödel','Tiroler Knödel mit Spinat und Butter.',40,ARRAY['vegetarisch'],ARRAY['Gluten','Eier','Milch/Laktose'],'spinat','Spinat auftauen und ausdrücken. Semmelwürfel mit warmer Milch übergießen.','Eier und Spinat unter die Semmelmasse mischen. Knödel formen und in leicht siedendem Salzwasser ziehen lassen.',20,'Mit geschmolzener Butter servieren.'),
(4,'Käsespätzle','Spätzle mit Bergkäse und goldbraunen Zwiebeln.',25,ARRAY['vegetarisch'],ARRAY['Gluten','Eier','Milch/Laktose'],'kaese','Zwiebeln in Ringe schneiden, Bergkäse reiben.','Zwiebeln in Butter goldbraun braten. Frische Spätzle separat erhitzen und mit Käse verrühren.',15,'Mit den Röstzwiebeln und Pfeffer servieren.'),
(5,'Linsencurry','Veganes Curry mit roten Linsen und Kokosmilch.',30,ARRAY['vegan'],ARRAY[]::text[],'linsen','Zwiebel und Karotten würfeln, Linsen in einem Sieb spülen.','Gemüse in Öl anbraten, Curry zugeben. Linsen, Kokosmilch und 400 ml Wasser zufügen und köcheln.',20,'Spinat unterheben, salzen und heiß servieren.'),
(6,'Lachs mit Ofengemüse','Saftiger Lachs mit Erdäpfeln und Zucchini.',35,ARRAY[]::text[],ARRAY['Fisch'],'lachs','Backofen auf 200 °C vorheizen. Erdäpfel in dünne Spalten und Zucchini in Scheiben schneiden.','Gemüse mit Öl und Salz 15 Minuten backen. Lachs darauflegen und weitere 15 Minuten garen.',30,'Mit Zitronensaft und Pfeffer servieren.'),
(7,'Spaghetti Bolognese','Familienklassiker mit Rindfleisch und Tomaten.',45,ARRAY[]::text[],ARRAY['Gluten'],'rind','Zwiebeln und Karotten fein würfeln.','Faschiertes in Öl anbraten, Gemüse zugeben. Passata einrühren und köcheln lassen. Spaghetti nach Packungsangabe kochen.',30,'Sauce salzen, pfeffern und mit den Spaghetti servieren.'),
(8,'Gemüsereis','Bunter veganer Reis mit frischem Gemüse.',20,ARRAY['vegan'],ARRAY[]::text[],'reis','Paprika und Karotten würfeln. Reis spülen.','Reis in 600 ml Wasser garen. Gemüse in Öl braten und Erbsen zugeben.',15,'Reis mit Gemüse mischen, salzen und servieren.'),
(9,'Hendl-Gemüse-Pfanne','Schnelle Hendlpfanne mit Zucchini und Paprika.',20,ARRAY[]::text[],ARRAY[]::text[],'huhn','Hendlbrust, Paprika und Zucchini in mundgerechte Stücke schneiden.','Hendl in Öl durchbraten. Gemüse zufügen und bissfest garen.',12,'Mit Salz und Pfeffer abschmecken und servieren.'),
(10,'Erdäpfel-Gratin','Überbackene Erdäpfel mit Käse und Obers.',60,ARRAY['vegetarisch'],ARRAY['Milch/Laktose'],'erdapfel','Ofen auf 180 °C vorheizen. Erdäpfel schälen und dünn hobeln.','Erdäpfel in eine Form schichten, Obers und 100 ml Wasser zugießen. Mit Käse bestreuen und backen.',45,'Kurz ruhen lassen und mit Pfeffer servieren.'),
(11,'Champignon-Rahm-Pasta','Cremige Pasta mit frischen Champignons.',25,ARRAY['vegetarisch'],ARRAY['Gluten','Milch/Laktose'],'champignons','Champignons putzen und in Scheiben schneiden, Zwiebel würfeln.','Pasta kochen. Zwiebel und Pilze in Butter braten, Obers zugeben und kurz köcheln.',15,'Pasta unterheben und mit Salz und Pfeffer abschmecken.'),
(12,'Kichererbsen-Eintopf','Veganes Gemüsegericht mit Kichererbsen.',30,ARRAY['vegan'],ARRAY[]::text[],'kichererbsen','Karotten, Zucchini und Zwiebeln würfeln, Kichererbsen abspülen.','Gemüse in Öl anschwitzen. Passata, Kichererbsen und 200 ml Wasser zufügen und köcheln.',20,'Mit Paprikapulver und Salz abschmecken.'),
(13,'Fischfilet mit Erdäpfelpüree','Mildes Fischfilet mit cremigem Püree.',30,ARRAY[]::text[],ARRAY['Fisch','Milch/Laktose'],'fisch','Erdäpfel schälen und würfeln. Fisch trocken tupfen.','Erdäpfel in Salzwasser weich kochen. Fisch in Butter je nach Dicke 4–6 Minuten pro Seite garen.',20,'Erdäpfel abgießen und mit warmer Milch stampfen. Mit Fisch servieren.'),
(14,'Tomaten-Mozzarella-Pasta','Schnelle Pasta mit Tomaten und Mozzarella.',15,ARRAY['vegetarisch'],ARRAY['Gluten','Milch/Laktose'],'tomaten','Tomaten halbieren und Mozzarella würfeln.','Pasta nach Packungsangabe kochen. Tomaten in Öl kurz anbraten.',10,'Pasta und Mozzarella unterheben, salzen und servieren.'),
(15,'Bratkartoffeln mit Ei','Knusprige Erdäpfel mit Spiegelei.',35,ARRAY['vegetarisch'],ARRAY['Eier'],'erdapfel','Erdäpfel schälen, würfeln und 10 Minuten in Wasser vorkochen. Zwiebel schneiden.','Erdäpfel und Zwiebeln in Öl goldbraun braten. Eier in einer zweiten Pfanne als Spiegeleier garen.',20,'Mit Salz und Pfeffer würzen und gemeinsam servieren.')
) AS r(n,title,description,minutes,tags,allergens,main,prep,cook,timer,finish);

INSERT INTO public.ingredient_translations(ingredient_key,locale,display_name)
SELECT k,loc,name FROM (VALUES
('huehnerkeulen','Hühnerkeulen','Hähnchenschenkel','chicken legs','cosce di pollo','muslos de pollo'),
('zwiebeln','Zwiebeln','Zwiebeln','onions','cipolle','cebollas'),
('reis','Reis','Reis','rice','riso','arroz'),
('sauerrahm','Sauerrahm','saure Sahne','sour cream','panna acida','nata agria'),
('erdapfel','Erdäpfel','Kartoffeln','potatoes','patate','patatas'),
('spinat','Spinat','Spinat','spinach','spinaci','espinacas'),
('semmelwuerfel','Semmelwürfel','Brotwürfel','bread cubes','pane a cubetti','pan en dados'),
('milch','Milch','Milch','milk','latte','leche'),
('eier','Eier','Eier','eggs','uova','huevos'),
('butter','Butter','Butter','butter','burro','mantequilla'),
('spaetzle','Frische Spätzle','Frische Spätzle','fresh spaetzle','spätzle freschi','spätzle frescos'),
('bergkaese','Bergkäse','Bergkäse','mountain cheese','formaggio di montagna','queso de montaña'),
('rote_linsen','Rote Linsen','Rote Linsen','red lentils','lenticchie rosse','lentejas rojas'),
('kokosmilch','Kokosmilch','Kokosmilch','coconut milk','latte di cocco','leche de coco'),
('karotten','Karotten','Möhren','carrots','carote','zanahorias'),
('lachs','Lachsfilet','Lachsfilet','salmon fillet','filetto di salmone','filete de salmón'),
('zucchini','Zucchini','Zucchini','courgettes','zucchine','calabacines'),
('zitrone','Zitrone','Zitrone','lemon','limone','limón'),
('rinderfaschiertes','Rinderfaschiertes','Rinderhackfleisch','minced beef','carne bovina macinata','carne picada de ternera'),
('passata','Passierte Tomaten','Passierte Tomaten','tomato passata','passata di pomodoro','tomate triturado'),
('spaghetti','Spaghetti','Spaghetti','spaghetti','spaghetti','espaguetis'),
('paprika','Paprika','Paprika','bell peppers','peperoni','pimientos'),
('erbsen','Erbsen','Erbsen','peas','piselli','guisantes'),
('hendlbrust','Hendlbrust','Hähnchenbrust','chicken breast','petto di pollo','pechuga de pollo'),
('obers','Schlagobers','Sahne','cream','panna','nata'),
('champignons','Champignons','Champignons','mushrooms','funghi champignon','champiñones'),
('kichererbsen','Kichererbsen, abgetropft','Kichererbsen, abgetropft','chickpeas, drained','ceci scolati','garbanzos escurridos'),
('fischfilet','Weißfischfilet','Weißfischfilet','white fish fillet','filetto di pesce bianco','filete de pescado blanco'),
('tomaten','Tomaten','Tomaten','tomatoes','pomodori','tomates'),
('mozzarella','Mozzarella','Mozzarella','mozzarella','mozzarella','mozzarella'),
('oel','Rapsöl','Rapsöl','rapeseed oil','olio di colza','aceite de colza'),
('paprikapulver','Paprikapulver edelsüß','Paprikapulver edelsüß','sweet paprika','paprica dolce','pimentón dulce'),
('curry','Currypulver','Currypulver','curry powder','curry in polvere','curry en polvo'),
('salz','Salz','Salz','salt','sale','sal'),
('pfeffer','Pfeffer','Pfeffer','pepper','pepe','pimienta'),
('majoran','Majoran','Majoran','marjoram','maggiorana','mejorana')
) AS i(k,at,de,en,it,es) CROSS JOIN LATERAL (VALUES('de-AT',at),('de-DE',de),('en',en),('it',it),('es',es)) AS t(loc,name)
ON CONFLICT(ingredient_key,locale) DO UPDATE SET display_name=excluded.display_name;

INSERT INTO public.recipe_ingredients(recipe_id,ingredient_key,display_name,quantity,unit,aisle,is_pantry)
SELECT ('60000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,k,(SELECT display_name FROM ingredient_translations WHERE ingredient_key=k AND locale='de-AT'),q,u,a,false FROM (VALUES
(1,'huehnerkeulen',800,'g','Fleisch & Fisch'),(1,'zwiebeln',200,'g','Obst & Gemüse'),(1,'reis',300,'g','Trockenwaren'),(1,'sauerrahm',150,'g','Milchprodukte'),
(2,'erdapfel',1000,'g','Obst & Gemüse'),(2,'zwiebeln',300,'g','Obst & Gemüse'),
(3,'spinat',400,'g','Tiefkühl'),(3,'semmelwuerfel',300,'g','Brot & Gebäck'),(3,'milch',250,'ml','Milchprodukte'),(3,'eier',2,'stk','Milchprodukte'),(3,'butter',40,'g','Milchprodukte'),
(4,'spaetzle',800,'g','Milchprodukte'),(4,'bergkaese',200,'g','Milchprodukte'),(4,'zwiebeln',300,'g','Obst & Gemüse'),(4,'butter',40,'g','Milchprodukte'),
(5,'rote_linsen',300,'g','Trockenwaren'),(5,'kokosmilch',400,'ml','Trockenwaren'),(5,'zwiebeln',150,'g','Obst & Gemüse'),(5,'karotten',300,'g','Obst & Gemüse'),(5,'spinat',200,'g','Tiefkühl'),
(6,'lachs',600,'g','Fleisch & Fisch'),(6,'erdapfel',800,'g','Obst & Gemüse'),(6,'zucchini',500,'g','Obst & Gemüse'),(6,'zitrone',1,'stk','Obst & Gemüse'),
(7,'rinderfaschiertes',500,'g','Fleisch & Fisch'),(7,'zwiebeln',150,'g','Obst & Gemüse'),(7,'karotten',200,'g','Obst & Gemüse'),(7,'passata',700,'ml','Trockenwaren'),(7,'spaghetti',400,'g','Trockenwaren'),
(8,'reis',300,'g','Trockenwaren'),(8,'paprika',300,'g','Obst & Gemüse'),(8,'karotten',250,'g','Obst & Gemüse'),(8,'erbsen',200,'g','Tiefkühl'),
(9,'hendlbrust',600,'g','Fleisch & Fisch'),(9,'paprika',300,'g','Obst & Gemüse'),(9,'zucchini',400,'g','Obst & Gemüse'),
(10,'erdapfel',1000,'g','Obst & Gemüse'),(10,'obers',250,'ml','Milchprodukte'),(10,'bergkaese',150,'g','Milchprodukte'),
(11,'spaghetti',400,'g','Trockenwaren'),(11,'champignons',500,'g','Obst & Gemüse'),(11,'zwiebeln',150,'g','Obst & Gemüse'),(11,'obers',250,'ml','Milchprodukte'),(11,'butter',30,'g','Milchprodukte'),
(12,'kichererbsen',500,'g','Trockenwaren'),(12,'karotten',300,'g','Obst & Gemüse'),(12,'zucchini',400,'g','Obst & Gemüse'),(12,'zwiebeln',150,'g','Obst & Gemüse'),(12,'passata',500,'ml','Trockenwaren'),
(13,'fischfilet',600,'g','Fleisch & Fisch'),(13,'erdapfel',1000,'g','Obst & Gemüse'),(13,'milch',200,'ml','Milchprodukte'),(13,'butter',40,'g','Milchprodukte'),
(14,'spaghetti',400,'g','Trockenwaren'),(14,'tomaten',500,'g','Obst & Gemüse'),(14,'mozzarella',250,'g','Milchprodukte'),
(15,'erdapfel',1000,'g','Obst & Gemüse'),(15,'zwiebeln',200,'g','Obst & Gemüse'),(15,'eier',4,'stk','Milchprodukte')
) AS i(n,k,q,u,a);
INSERT INTO public.recipe_ingredients(recipe_id,ingredient_key,display_name,quantity,unit,aisle,is_pantry)
SELECT r.id,p.k,(SELECT display_name FROM ingredient_translations WHERE ingredient_key=p.k AND locale='de-AT'),p.q,p.u,'Gewürze & Öl',true FROM recipes r CROSS JOIN (VALUES('salz',4,'g'),('pfeffer',1,'g')) p(k,q,u) WHERE r.id::text LIKE '60000000-0000-0000-0000-%';
INSERT INTO public.recipe_ingredients(recipe_id,ingredient_key,display_name,quantity,unit,aisle,is_pantry)
SELECT ('60000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,k,(SELECT display_name FROM ingredient_translations WHERE ingredient_key=k AND locale='de-AT'),q,u,'Gewürze & Öl',true FROM (VALUES(1,'oel',20,'ml'),(1,'paprikapulver',10,'g'),(2,'oel',20,'ml'),(2,'paprikapulver',10,'g'),(2,'majoran',2,'g'),(5,'oel',20,'ml'),(5,'curry',10,'g'),(6,'oel',30,'ml'),(7,'oel',20,'ml'),(8,'oel',20,'ml'),(9,'oel',20,'ml'),(12,'oel',20,'ml'),(12,'paprikapulver',5,'g'),(14,'oel',20,'ml'),(15,'oel',30,'ml')) AS p(n,k,q,u);

INSERT INTO public.ingredient_prices(ingredient_key,store,price,per_quantity,unit)
SELECT k,store,round(base*factor,2),q,u FROM (VALUES
('huehnerkeulen',5.99,1000,'g'),('zwiebeln',1.49,1000,'g'),('reis',1.99,1000,'g'),('sauerrahm',0.99,250,'g'),('erdapfel',2.99,2000,'g'),('spinat',1.49,450,'g'),('semmelwuerfel',1.99,500,'g'),('milch',1.29,1000,'ml'),('eier',2.99,10,'stk'),('butter',2.49,250,'g'),('spaetzle',2.49,500,'g'),('bergkaese',3.49,250,'g'),('rote_linsen',1.79,500,'g'),('kokosmilch',1.49,400,'ml'),('karotten',1.29,1000,'g'),('lachs',5.49,250,'g'),('zucchini',2.49,1000,'g'),('zitrone',0.49,1,'stk'),('rinderfaschiertes',5.49,500,'g'),('passata',0.99,500,'ml'),('spaghetti',0.99,500,'g'),('paprika',2.49,500,'g'),('erbsen',1.99,750,'g'),('hendlbrust',6.49,500,'g'),('obers',1.19,250,'ml'),('champignons',1.79,250,'g'),('kichererbsen',0.99,250,'g'),('fischfilet',4.99,400,'g'),('tomaten',2.49,500,'g'),('mozzarella',0.99,125,'g')
) AS p(k,base,q,u) CROSS JOIN (VALUES('spar',1.08),('billa',1.10),('hofer',1.00),('lidl',0.98)) AS s(store,factor) ON CONFLICT(ingredient_key,store) DO UPDATE SET price=excluded.price,per_quantity=excluded.per_quantity,unit=excluded.unit;
INSERT INTO public.deals(store,ingredient_key,product_name,deal_price,regular_price,package_quantity,unit,valid_from,valid_to)
SELECT s,k,name,dp,rp,q,u,'2026-11-09'::date,'2026-11-15'::date FROM (VALUES
('hofer','huehnerkeulen','Hühnerkeulen frisch 1 kg',3.99,5.99,1000,'g'),('hofer','erdapfel','Erdäpfel 2 kg',1.99,2.99,2000,'g'),('hofer','milch','Vollmilch 1 l',0.99,1.29,1000,'ml'),
('lidl','karotten','Karotten 1 kg',0.89,1.29,1000,'g'),('lidl','spaghetti','Spaghetti 500 g',0.69,0.99,500,'g'),('lidl','mozzarella','Mozzarella 125 g',0.79,0.99,125,'g'),
('spar','lachs','Lachsfilet 250 g',4.49,5.99,250,'g'),('spar','bergkaese','Bergkäse 250 g',2.99,3.79,250,'g'),('spar','champignons','Champignons 250 g',1.49,1.99,250,'g'),
('billa','rinderfaschiertes','Rinderfaschiertes 500 g',4.49,5.99,500,'g'),('billa','paprika','Paprika-Mix 500 g',1.79,2.79,500,'g'),('billa','eier','Freilandeier 10 Stück',2.49,3.29,10,'stk')
) AS d(s,k,name,dp,rp,q,u);

INSERT INTO public.recipe_translations(recipe_id,locale,title,description,steps)
SELECT r.id,t.loc,t.title,t.description,jsonb_build_array(jsonb_build_object('text',t.prep),jsonb_build_object('text',t.cook,'timer_minutes',(r.steps->1->>'timer_minutes')::int),jsonb_build_object('text',t.finish)) FROM (VALUES
(1,'de-DE','Paprikahähnchen','Hähnchen in Paprikasauce mit Reis.','Zwiebeln würfeln, Hähnchenschenkel trocknen und Reis in Wasser kochen.','Hähnchen in Öl anbraten, Zwiebeln und Paprikapulver zufügen. Mit 300 ml Wasser zugedeckt garen.','Saure Sahne einrühren, salzen und mit Reis servieren.'),
(1,'en','Paprika chicken','Chicken in creamy paprika sauce with rice.','Dice onions, pat chicken legs dry and cook rice in twice its volume of water.','Brown chicken in oil. Add onions and paprika, pour in 300 ml water and simmer covered.','Stir in sour cream, season with salt and serve with rice.'),
(1,'it','Pollo alla paprica','Pollo cremoso alla paprica con riso.','Taglia le cipolle, asciuga il pollo e cuoci il riso nel doppio volume di acqua.','Rosola il pollo nell’olio. Aggiungi cipolle e paprica, versa 300 ml di acqua e cuoci coperto.','Incorpora la panna acida, sala e servi con il riso.'),
(1,'es','Pollo al pimentón','Pollo cremoso al pimentón con arroz.','Pica las cebollas, seca el pollo y cuece el arroz con el doble de agua.','Dora el pollo en aceite. Añade cebollas y pimentón, vierte 300 ml de agua y cocina tapado.','Incorpora la nata agria, añade sal y sirve con arroz.'),
(2,'de-DE','Kartoffelgulasch','Veganes Gulasch mit Kartoffeln.','Kartoffeln schälen und würfeln, Zwiebeln schneiden.','Zwiebeln in Öl dünsten, Paprikapulver zugeben. Kartoffeln und 700 ml Wasser zufügen und köcheln.','Mit Majoran, Salz und Pfeffer würzen.'),
(2,'en','Potato goulash','Warming vegan potato stew.','Peel and dice potatoes and chop onions.','Soften onions in oil, add paprika, potatoes and 700 ml water and simmer.','Season with marjoram, salt and pepper.'),
(2,'it','Gulasch di patate','Gulasch vegano con patate.','Sbuccia e taglia le patate e trita le cipolle.','Rosola le cipolle nell’olio, aggiungi paprica, patate e 700 ml di acqua e lascia sobbollire.','Condisci con maggiorana, sale e pepe.'),
(2,'es','Gulash de patatas','Guiso vegano de patatas.','Pela y corta las patatas y pica las cebollas.','Sofríe las cebollas, añade pimentón, patatas y 700 ml de agua y cocina a fuego lento.','Sazona con mejorana, sal y pimienta.'),
(3,'de-DE','Spinatknödel','Tiroler Brotknödel mit Spinat.','Spinat auftauen, ausdrücken und Brotwürfel mit warmer Milch übergießen.','Eier und Spinat einmischen, Knödel formen und in leicht siedendem Salzwasser ziehen lassen.','Mit geschmolzener Butter servieren.'),
(3,'en','Spinach dumplings','Tyrolean bread dumplings with spinach.','Thaw and squeeze spinach. Soak bread cubes in warm milk.','Mix in eggs and spinach, shape dumplings and poach in gently simmering salted water.','Serve with melted butter.'),
(3,'it','Canederli agli spinaci','Canederli tirolesi con spinaci.','Scongela e strizza gli spinaci. Bagna il pane con latte caldo.','Unisci uova e spinaci, forma i canederli e cuocili in acqua salata appena bollente.','Servi con burro fuso.'),
(3,'es','Albóndigas de pan y espinacas','Bolas de pan tirolesas con espinacas.','Descongela y escurre las espinacas. Remoja el pan en leche caliente.','Mezcla con huevos y espinacas, forma bolas y cuécelas en agua salada a fuego suave.','Sirve con mantequilla fundida.'),
(4,'de-DE','Käsespätzle','Spätzle mit Bergkäse und Röstzwiebeln.','Zwiebeln in Ringe schneiden und Käse reiben.','Zwiebeln in Butter bräunen. Frische Spätzle erhitzen und Käse unterrühren.','Mit Zwiebeln und Pfeffer servieren.'),
(4,'en','Cheese spaetzle','Spaetzle with mountain cheese and browned onions.','Slice onions into rings and grate cheese.','Brown onions in butter. Heat fresh spaetzle separately and stir in cheese.','Top with onions and pepper.'),
(4,'it','Spätzle al formaggio','Spätzle con formaggio e cipolle dorate.','Taglia le cipolle ad anelli e grattugia il formaggio.','Dora le cipolle nel burro. Scalda gli spätzle e incorpora il formaggio.','Servi con cipolle e pepe.'),
(4,'es','Spätzle con queso','Spätzle con queso y cebolla dorada.','Corta las cebollas en aros y ralla el queso.','Dora las cebollas en mantequilla. Calienta los spätzle y mezcla con queso.','Sirve con cebolla y pimienta.'),
(5,'de-DE','Linsencurry','Veganes Curry mit roten Linsen.','Zwiebel und Möhren würfeln, Linsen abspülen.','Gemüse in Öl braten, Curry, Linsen, Kokosmilch und 400 ml Wasser zufügen und köcheln.','Spinat unterheben und salzen.'),
(5,'en','Lentil curry','Vegan red lentil and coconut curry.','Dice onion and carrots and rinse lentils.','Fry vegetables in oil. Add curry, lentils, coconut milk and 400 ml water and simmer.','Fold in spinach and season with salt.'),
(5,'it','Curry di lenticchie','Curry vegano di lenticchie rosse e cocco.','Taglia cipolla e carote, sciacqua le lenticchie.','Rosola le verdure. Aggiungi curry, lenticchie, latte di cocco e 400 ml di acqua e cuoci.','Unisci gli spinaci e sala.'),
(5,'es','Curry de lentejas','Curry vegano de lentejas rojas y coco.','Pica cebolla y zanahorias y enjuaga las lentejas.','Sofríe las verduras. Añade curry, lentejas, leche de coco y 400 ml de agua y cocina.','Añade espinacas y sal.'),
(6,'de-DE','Lachs mit Ofengemüse','Lachs mit Kartoffeln und Zucchini.','Ofen auf 200 °C heizen. Kartoffeln in dünne Spalten und Zucchini in Scheiben schneiden.','Gemüse mit Öl und Salz 15 Minuten backen. Lachs auflegen und weitere 15 Minuten garen.','Mit Zitronensaft und Pfeffer servieren.'),
(6,'en','Salmon with roasted vegetables','Salmon with potatoes and courgettes.','Heat oven to 200 °C. Cut potatoes into thin wedges and slice courgettes.','Roast vegetables with oil and salt for 15 minutes. Add salmon and roast for 15 more minutes.','Serve with lemon juice and pepper.'),
(6,'it','Salmone con verdure al forno','Salmone con patate e zucchine.','Scalda il forno a 200 °C. Taglia le patate a spicchi sottili e affetta le zucchine.','Inforna le verdure con olio e sale per 15 minuti. Aggiungi il salmone e cuoci altri 15 minuti.','Servi con limone e pepe.'),
(6,'es','Salmón con verduras al horno','Salmón con patatas y calabacines.','Calienta el horno a 200 °C. Corta las patatas en gajos finos y los calabacines en rodajas.','Hornea las verduras con aceite y sal 15 minutos. Añade salmón y hornea otros 15 minutos.','Sirve con limón y pimienta.'),
(7,'de-DE','Spaghetti Bolognese','Spaghetti mit Rinderhackfleisch.','Zwiebeln und Möhren fein würfeln.','Hackfleisch in Öl braten, Gemüse und passierte Tomaten zufügen und köcheln. Spaghetti nach Packung kochen.','Sauce würzen und mit Spaghetti servieren.'),
(7,'en','Spaghetti Bolognese','Family spaghetti with beef and tomato sauce.','Finely dice onions and carrots.','Brown beef in oil, add vegetables and passata and simmer. Cook spaghetti following the packet.','Season sauce and serve with spaghetti.'),
(7,'it','Spaghetti alla bolognese','Spaghetti con ragù di manzo.','Trita cipolle e carote.','Rosola la carne, aggiungi verdure e passata e lascia sobbollire. Cuoci gli spaghetti secondo la confezione.','Condisci il ragù e servi con gli spaghetti.'),
(7,'es','Espaguetis a la boloñesa','Espaguetis con salsa de ternera y tomate.','Pica las cebollas y las zanahorias.','Dora la carne, añade verduras y tomate y cocina a fuego lento. Cuece la pasta según el paquete.','Sazona la salsa y sirve con espaguetis.'),
(8,'de-DE','Gemüsereis','Veganer Reis mit buntem Gemüse.','Paprika und Möhren würfeln, Reis abspülen.','Reis in 600 ml Wasser kochen. Gemüse in Öl braten und Erbsen zufügen.','Reis und Gemüse mischen und salzen.'),
(8,'en','Vegetable rice','Colourful vegan rice with vegetables.','Dice peppers and carrots and rinse rice.','Cook rice in 600 ml water. Fry vegetables in oil and add peas.','Mix rice with vegetables and salt.'),
(8,'it','Riso alle verdure','Riso vegano con verdure colorate.','Taglia peperoni e carote e sciacqua il riso.','Cuoci il riso in 600 ml di acqua. Rosola le verdure e aggiungi i piselli.','Mescola riso e verdure e sala.'),
(8,'es','Arroz con verduras','Arroz vegano con verduras variadas.','Corta pimientos y zanahorias y lava el arroz.','Cuece el arroz en 600 ml de agua. Sofríe verduras y añade guisantes.','Mezcla todo y añade sal.'),
(9,'de-DE','Hähnchen-Gemüse-Pfanne','Schnelle Hähnchenpfanne mit Gemüse.','Hähnchenbrust, Paprika und Zucchini in Stücke schneiden.','Hähnchen in Öl durchbraten, Gemüse zufügen und bissfest garen.','Mit Salz und Pfeffer würzen.'),
(9,'en','Chicken and vegetable skillet','Quick chicken with peppers and courgettes.','Cut chicken breast, peppers and courgettes into bite-sized pieces.','Cook chicken thoroughly in oil. Add vegetables and cook until tender-crisp.','Season with salt and pepper.'),
(9,'it','Pollo e verdure in padella','Pollo veloce con peperoni e zucchine.','Taglia pollo, peperoni e zucchine a bocconcini.','Cuoci bene il pollo nell’olio. Aggiungi le verdure e cuoci lasciandole croccanti.','Condisci con sale e pepe.'),
(9,'es','Pollo con verduras en sartén','Pollo rápido con pimientos y calabacines.','Corta el pollo y las verduras en trozos.','Cocina bien el pollo en aceite. Añade verduras y cocina hasta que estén tiernas.','Sazona con sal y pimienta.'),
(10,'de-DE','Kartoffelgratin','Kartoffeln mit Käse und Sahne.','Ofen auf 180 °C heizen. Kartoffeln schälen und dünn hobeln.','Kartoffeln einschichten, Sahne und 100 ml Wasser zugießen, mit Käse bestreuen und backen.','Kurz ruhen lassen und pfeffern.'),
(10,'en','Potato gratin','Creamy baked potatoes with cheese.','Heat oven to 180 °C. Peel and thinly slice potatoes.','Layer potatoes, pour over cream and 100 ml water, top with cheese and bake.','Rest briefly and add pepper.'),
(10,'it','Gratin di patate','Patate al forno con panna e formaggio.','Scalda il forno a 180 °C. Sbuccia e affetta sottilmente le patate.','Disponi le patate, versa panna e 100 ml di acqua, copri con formaggio e inforna.','Lascia riposare e aggiungi pepe.'),
(10,'es','Gratén de patatas','Patatas al horno con nata y queso.','Calienta el horno a 180 °C. Pela y corta las patatas muy finas.','Coloca las patatas, añade nata y 100 ml de agua, cubre con queso y hornea.','Deja reposar y añade pimienta.'),
(11,'de-DE','Champignon-Rahm-Pasta','Cremige Nudeln mit Champignons.','Pilze putzen und schneiden, Zwiebel würfeln.','Pasta kochen. Pilze und Zwiebel in Butter braten, Sahne zufügen und kurz köcheln.','Pasta unterheben und würzen.'),
(11,'en','Creamy mushroom pasta','Pasta with fresh mushrooms and cream.','Clean and slice mushrooms and dice onion.','Cook pasta. Fry mushrooms and onion in butter, add cream and simmer briefly.','Fold in pasta and season.'),
(11,'it','Pasta cremosa ai funghi','Pasta con champignon e panna.','Pulisci e affetta i funghi e trita la cipolla.','Cuoci la pasta. Rosola funghi e cipolla nel burro, aggiungi panna e cuoci brevemente.','Unisci la pasta e condisci.'),
(11,'es','Pasta cremosa con champiñones','Pasta con champiñones y nata.','Limpia y corta los champiñones y pica la cebolla.','Cuece la pasta. Sofríe champiñones y cebolla en mantequilla, añade nata y cocina brevemente.','Añade pasta y sazona.'),
(12,'de-DE','Kichererbsen-Eintopf','Veganer Eintopf mit Gemüse.','Möhren, Zucchini und Zwiebeln würfeln, Kichererbsen abspülen.','Gemüse in Öl dünsten. Passierte Tomaten, Kichererbsen und 200 ml Wasser zufügen und köcheln.','Mit Paprikapulver und Salz würzen.'),
(12,'en','Chickpea stew','Vegan chickpea and vegetable stew.','Dice carrots, courgettes and onions and rinse chickpeas.','Soften vegetables in oil. Add passata, chickpeas and 200 ml water and simmer.','Season with paprika and salt.'),
(12,'it','Stufato di ceci','Stufato vegano di ceci e verdure.','Taglia carote, zucchine e cipolle e sciacqua i ceci.','Rosola le verdure. Aggiungi passata, ceci e 200 ml di acqua e cuoci.','Condisci con paprica e sale.'),
(12,'es','Guiso de garbanzos','Guiso vegano de garbanzos y verduras.','Corta zanahorias, calabacines y cebollas y enjuaga garbanzos.','Sofríe las verduras, añade tomate, garbanzos y 200 ml de agua y cocina.','Sazona con pimentón y sal.'),
(13,'de-DE','Fischfilet mit Kartoffelpüree','Fisch mit cremigem Kartoffelpüree.','Kartoffeln schälen und würfeln, Fisch trocken tupfen.','Kartoffeln in Salzwasser kochen. Fisch in Butter je nach Dicke 4–6 Minuten pro Seite braten.','Kartoffeln mit warmer Milch stampfen und mit Fisch servieren.'),
(13,'en','Fish with mashed potatoes','White fish with creamy mashed potatoes.','Peel and dice potatoes and pat fish dry.','Boil potatoes in salted water. Fry fish in butter for 4–6 minutes per side depending on thickness.','Mash potatoes with warm milk and serve with fish.'),
(13,'it','Pesce con purè di patate','Pesce bianco con purè cremoso.','Sbuccia e taglia le patate e asciuga il pesce.','Lessa le patate. Cuoci il pesce nel burro 4–6 minuti per lato secondo lo spessore.','Schiaccia le patate con latte caldo e servi con il pesce.'),
(13,'es','Pescado con puré de patatas','Pescado blanco con puré cremoso.','Pela y corta las patatas y seca el pescado.','Cuece las patatas. Fríe el pescado en mantequilla 4–6 minutos por lado según el grosor.','Machaca patatas con leche caliente y sirve con pescado.'),
(14,'de-DE','Tomaten-Mozzarella-Pasta','Schnelle Pasta mit Tomaten und Käse.','Tomaten halbieren und Mozzarella würfeln.','Pasta nach Packung kochen, Tomaten kurz in Öl braten.','Pasta und Mozzarella unterheben, salzen und servieren.'),
(14,'en','Tomato and mozzarella pasta','Quick pasta with tomatoes and mozzarella.','Halve tomatoes and dice mozzarella.','Cook pasta following the packet and briefly fry tomatoes in oil.','Fold in pasta and mozzarella, salt and serve.'),
(14,'it','Pasta con pomodori e mozzarella','Pasta veloce con pomodori e mozzarella.','Taglia i pomodori a metà e la mozzarella a cubetti.','Cuoci la pasta secondo la confezione e rosola brevemente i pomodori nell’olio.','Unisci pasta e mozzarella, sala e servi.'),
(14,'es','Pasta con tomate y mozzarella','Pasta rápida con tomate y mozzarella.','Corta tomates por la mitad y mozzarella en dados.','Cuece la pasta según el paquete y sofríe brevemente los tomates.','Mezcla pasta y mozzarella, añade sal y sirve.'),
(15,'de-DE','Bratkartoffeln mit Ei','Knusprige Kartoffeln mit Spiegelei.','Kartoffeln schälen, würfeln und 10 Minuten vorkochen. Zwiebel schneiden.','Kartoffeln und Zwiebeln in Öl goldbraun braten. Eier separat als Spiegeleier braten.','Mit Salz und Pfeffer würzen und servieren.'),
(15,'en','Fried potatoes with eggs','Crispy potatoes with fried eggs.','Peel and dice potatoes and parboil for 10 minutes. Chop onion.','Fry potatoes and onions in oil until golden. Fry eggs in a separate pan.','Season with salt and pepper and serve together.'),
(15,'it','Patate saltate con uova','Patate croccanti con uova al tegamino.','Sbuccia e taglia le patate e lessale per 10 minuti. Taglia la cipolla.','Dora patate e cipolle nell’olio. Cuoci le uova in una padella separata.','Condisci con sale e pepe e servi insieme.'),
(15,'es','Patatas fritas con huevos','Patatas crujientes con huevos a la plancha.','Pela y corta las patatas y precuécelas 10 minutos. Corta la cebolla.','Dora patatas y cebollas en aceite. Cocina los huevos en otra sartén.','Sazona con sal y pimienta y sirve todo junto.')
) AS t(n,loc,title,description,prep,cook,finish) JOIN public.recipes r ON r.id=('60000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid;