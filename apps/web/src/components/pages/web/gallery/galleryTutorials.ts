/**
 * How each gallery piece is built, one entry per `<g id="step-N">` in its SVG
 * (`galleryTutorials.test.ts` keeps the counts in sync). Text names only real editor controls;
 * anything in backticks is drawn as key caps (`mod` = ⌘ / Ctrl).
 */

export interface TutorialStep {
    title: string;
    text: string;
    /** A shortcut or habit worth stealing, shown as a callout. */
    trick?: string;
}

export interface GalleryTutorial {
    level: 'Beginner' | 'Intermediate';
    minutes: number;
    intro: string;
    steps: TutorialStep[];
    /** Takeaways that work beyond this piece. */
    tricks: string[];
}

const LAYER_ORDER =
    'Build back to front: what you add later sits on top. `mod+↓` and `mod+↑` fix the order when you forget.';

export const GALLERY_TUTORIALS: Record<string, GalleryTutorial> = {
    'cartoon-astronaut': {
        level: 'Beginner',
        minutes: 25,
        intro: 'A friendly character made almost entirely from rectangles and circles. The polish comes from one consistent outline colour, a gradient visor and three white highlight strokes.',
        steps: [
            {
                title: 'Night sky and a ringed planet',
                text: 'Cover the page with a Rectangle and give it a Radial fill in Fill & Shadow (deep indigo in the middle, near-black at the edge). Scatter small white Circles for stars, then add a Circle with a peach-to-pink Linear gradient for the planet.',
                trick: 'Draw the ring as two arcs with the Pen (`P`): the back half before the planet, the front half after it. That is the whole "behind and in front" illusion.',
            },
            {
                title: 'Moon surface',
                text: 'Draw the ground with the Pen: click along the bottom edge, drag once in the middle for a soft curve, and close the path. Craters are two stacked Ellipses, a darker one and a lighter one nudged up by 2 px.',
            },
            {
                title: 'Backpack, arms, flag and boots',
                text: 'Parts that sit behind the body come first. Each arm is one curved Pen path with a thick dark stroke; duplicate it with `mod+D`, make the copy thinner and white, and it reads as an outlined sleeve.',
                trick: 'Outline a line by stacking a wide dark copy under a narrower light one. No outline feature needed.',
            },
            {
                title: 'Body and chest panel',
                text: 'A Rounded Rectangle with a large corner radius (top bar) makes the suit. Add a smaller rounded panel and three tiny buttons, then the round gloves on top of the sleeve ends.',
            },
            {
                title: 'Helmet',
                text: 'A big Circle with the same 5 px dark stroke as everything else, an Ellipse visor with a light-blue to indigo Linear gradient, two orange ear pieces and an antenna.',
                trick: 'Pick one outline colour and width for the whole character and keep it in the palette: consistency is what makes it look designed.',
            },
            {
                title: 'Face and reflections',
                text: 'Two dark Ellipses for eyes with a white dot each, pink cheeks at 65% opacity and a smile drawn with the Pen. Finish with curved white Pen strokes on the visor and helmet: highlights sell the shine.',
            },
        ],
        tricks: [
            LAYER_ORDER,
            'Lower a highlight’s opacity in the Layers panel instead of mixing a paler colour: it stays right on any background.',
            'Group the finished character with `mod+G` so you can move and scale it as one piece.',
        ],
    },
    'cartoon-barista-cat': {
        level: 'Intermediate',
        minutes: 40,
        intro: 'Expression is all in the eyes: half-closed lids and angled brows turn a cute cat into a grumpy one. The café around it is simple shapes and type.',
        steps: [
            {
                title: 'Warm wall, lamp and shelf',
                text: 'A Rectangle with a cream Linear gradient for the wall, a Radial glow behind a lamp shade drawn with the Pen, and a shelf of Rounded Rectangles for jars.',
            },
            {
                title: 'Chalkboard menu',
                text: 'A dark Rounded Rectangle with a thick wooden stroke, then Text in a serif font. Align item names left and prices right so the columns line up.',
                trick: 'Write one row, `mod+D` it and nudge the copy down with the arrow keys; select all rows and Distribute them for even spacing.',
            },
            {
                title: 'Body and apron',
                text: 'Pen the shoulders as one rounded path, then the apron on top with a green fill and a white Text Pill name tag.',
            },
            {
                title: 'Head, ears and stripes',
                text: 'Ears are Triangles with a smaller pink Triangle inside. The head is a Pen path with wide cheeks. Tabby stripes are short, thick strokes with round caps.',
            },
            {
                title: 'The grumpy face',
                text: 'Draw each eye as an Ellipse, then cover its top half with a fur-coloured shape whose lower edge slopes toward the nose. A dark line along that edge is the eyelid. Add angled brows, a small pink nose and a frown.',
                trick: 'Mood comes from angles: brows sloping down toward the nose read as annoyed, sloping up read as sad.',
            },
            {
                title: 'Counter, paws and latte',
                text: 'A wide Rectangle with a dark wood gradient runs across the front and hides the bottom of the body. Paws are Ellipses with two short strokes for toes. The cup gets a latte heart and two soft steam curves.',
            },
        ],
        tricks: [
            'Use the eyedropper to reuse the fur colour exactly when you cover the eyes.',
            'A foreground object such as the counter hides untidy edges for free.',
            LAYER_ORDER,
        ],
    },
    'cartoon-robo-courier': {
        level: 'Beginner',
        minutes: 25,
        intro: 'A character made from rounded rectangles, with motion faked by speed lines and dust puffs. Good practice for building a scene in layers.',
        steps: [
            {
                title: 'Sky, sun and skyline',
                text: 'A light-blue Linear gradient, a pale sun with a larger 35% opacity Circle behind it for glow, and Rectangles in two pale blues for buildings. Windows are small lighter Rectangles.',
                trick: 'Make one window, `mod+D` it and move the copy; then select a whole row and duplicate the row.',
            },
            {
                title: 'Road and motion',
                text: 'A dark Rectangle for the road with white dashes. White horizontal strokes with round caps behind the robot, and three shrinking Circles of dust, say "fast" without any animation.',
            },
            {
                title: 'Wheel',
                text: 'Three centred Circles (tyre, rim, hub) plus a few short strokes for spokes. Select all three and use the align buttons in the top bar to centre them exactly.',
            },
            {
                title: 'Body and left arm',
                text: 'A Rounded Rectangle with an orange Linear gradient and a dark stroke. The screen is a lighter rounded panel with a heartbeat line drawn with the Pen using corner points only.',
            },
            {
                title: 'Parcel and carrying arm',
                text: 'A tan Rectangle with a pale tape strip, a label and a "fragile" mark, then the second arm drawn over it so the robot is really holding it.',
            },
            {
                title: 'Head and face',
                text: 'A white Rounded Rectangle head, a dark visor and two happy arcs for eyes (Pen: click, drag the middle point up, click). An antenna with a glowing tip finishes it.',
            },
        ],
        tricks: [
            'Arms are two stacked strokes, dark and wide under light and narrow, same as an outlined sleeve.',
            'Glow = the same colour again, larger and at low opacity, behind the object.',
            'Lock the background with `mod+L` once it is done so clicks land on the character.',
        ],
    },
    'cartoon-fox-detective': {
        level: 'Intermediate',
        minutes: 45,
        intro: 'A noir scene where light does the storytelling: a lamp cone with a fading gradient and a trail of glowing paw prints lead the eye to the clue.',
        steps: [
            {
                title: 'Night street',
                text: 'A dark navy Linear gradient, two building silhouettes in slightly different blues and a few lit windows in warm yellow, then a ground strip.',
            },
            {
                title: 'Street lamp and light',
                text: 'Draw the light cone as a Pen polygon, fill it with a Linear gradient from warm yellow to the night colour, and lower its opacity in the Layers panel. Paw prints are small Ellipses whose opacity rises as they near the lamp.',
                trick: 'A soft gradient plus low layer opacity is the quickest way to draw light.',
            },
            {
                title: 'Tail, legs and trench coat',
                text: 'The tail is one Pen shape with a white tip on top. The coat is a trapezoid with lapels, a belt, a gold buckle and two buttons. A thin line down the middle suggests the opening.',
            },
            {
                title: 'Arm and magnifying glass',
                text: 'The sleeve is a stacked stroke again. The lens is a pale Circle at 30% opacity with a bigger paw print inside, then a thick gold ring on top and a small white glint.',
            },
            {
                title: 'Fox head',
                text: 'Ears first (Triangles with dark insides), then the head as one Pen path that narrows to the snout. Lay the white cheek shape over it, then sly almond eyes, one raised brow and a smirk.',
                trick: 'One brow higher than the other gives instant attitude.',
            },
            {
                title: 'Fedora and caption',
                text: 'An Ellipse brim, a Pen crown with a dent and a dark band. Finish with an italic serif caption for the case name.',
            },
        ],
        tricks: [
            'Keep the darkest values in the background and the warmest colours on the subject.',
            'Use opacity steps (35%, 50%, 70%) to show distance along a trail.',
            LAYER_ORDER,
        ],
    },
    'manga-ronin': {
        level: 'Intermediate',
        minutes: 50,
        intro: 'Manga style comes from sharp angles: a pointed chin, jagged bangs and narrow eyes with thick upper lashes. A huge sun behind the head frames the portrait.',
        steps: [
            {
                title: 'Dusk sky and sun',
                text: 'A three-stop Linear gradient (plum, crimson, orange) and a big Circle with a yellow-to-red gradient. Three Rectangles in the horizon colour cut across the sun for a retro look.',
            },
            {
                title: 'Mountains',
                text: 'Two zigzag Pen paths: the far one lighter and at 80% opacity, the near one darker. Lighter and fainter reads as further away.',
            },
            {
                title: 'Kanji and seal',
                text: 'Two Text boxes stacked vertically in a Mincho serif, a thin rule and a small red square seal. Type is part of the composition in manga covers.',
            },
            {
                title: 'Katana over the shoulder',
                text: 'Two thick strokes (dark scabbard, red hilt), short gold strokes for the wrap, a gold Ellipse guard rotated to match the blade angle and a cap at the end.',
                trick: 'In the Node tool (`A`), `shift` keeps a drag straight or at 45°: handy for blades and beams.',
            },
            {
                title: 'Hair, neck and haori',
                text: 'Back hair behind the head, then the neck with a shadow shape under the chin, the dark haori and a white V collar with a red under-collar. The circle-and-diamond crest is two shapes.',
            },
            {
                title: 'Face and spiky hair',
                text: 'Pen the face with a pointed chin, then the bangs as one path of alternating long and short points. A topknot with a red tie sits on top.',
                trick: 'Draw spikes with corner points only (click, never drag): sharp tips are the manga look.',
            },
            {
                title: 'Eyes, brows and scar',
                text: 'For each eye: a thick angled upper lash, a white almond, a red-brown iris, a pupil and a white highlight. Brows slope toward the nose. A tiny nose line, a straight mouth and a red scar finish the face.',
            },
            {
                title: 'Petals and wind',
                text: 'Small pink Ellipses rotated at random angles, and two faint curved lines for wind. They add movement without competing with the face.',
            },
        ],
        tricks: [
            'Reuse one eye: draw the left, `mod+D`, flip it horizontally from the top bar, move it across.',
            'Reshape any path later with the Node tool (`A`): `alt` + click a node toggles sharp and smooth.',
            'A big simple shape behind a head (sun, halo) makes any portrait look composed.',
        ],
    },
    'manga-ace-pilot': {
        level: 'Intermediate',
        minutes: 45,
        intro: 'An energetic cover: speed lines radiating from the face, a scarf in the wind and a wink. Big gradient irises are the classic manga eye.',
        steps: [
            {
                title: 'Sky and speed lines',
                text: 'A diagonal blue Linear gradient, then thin white triangles that all start at the face and fan out to the edges at 10 to 14% opacity. A tiny jet with two contrail strokes sets the scene.',
                trick: 'Make one speed-line triangle, duplicate it, and drag only its two outer points with the Node tool (`A`).',
            },
            {
                title: 'Clouds and scarf',
                text: 'Cloud banks are Pen paths of soft bumps (drag each point). The red scarf is one wavy shape with a lighter crease line on top.',
            },
            {
                title: 'Back hair and bomber jacket',
                text: 'Hair behind the head first, then the neck, the brown jacket with a zip line, a fluffy collar drawn as a bumpy closed path, and a patch with a Star.',
            },
            {
                title: 'Face and teal bob',
                text: 'A soft rounded face (rounder chin than the ronin), teal bangs swept to one side and two side locks. A lighter curve on top of the hair is the shine.',
            },
            {
                title: 'Goggles',
                text: 'A strap stroke across the forehead and two Circles with a Linear gradient lens and a thick gold stroke. White arcs on each lens make them glassy.',
            },
            {
                title: 'Wink, grin and blush',
                text: 'The open eye: white shape, amber gradient iris, pupil, two highlights and a thick lash with a flick. The wink is one curved stroke. Add three short pink blush lines per cheek, a nose plaster and an open grin.',
                trick: 'Two highlights per eye (one big, one small) make manga eyes look wet and alive.',
            },
            {
                title: 'Title badge',
                text: 'A slanted red polygon with bold italic Text rotated a few degrees. Rotated type adds energy.',
            },
        ],
        tricks: [
            'Radiating lines that converge on the face point the viewer straight at it.',
            'Put one saturated accent (red) against cool blues.',
            'Hide finished parts with the eye in the Layers panel while you work on the face.',
        ],
    },
    'manga-shrine-maiden': {
        level: 'Intermediate',
        minutes: 50,
        intro: 'A calm, symmetrical portrait. The hime cut (blunt bangs and side locks), a moonlit torii and soft glows give it a quiet mood.',
        steps: [
            {
                title: 'Night sky and moon',
                text: 'A navy-to-violet gradient, a large Radial glow at low opacity, the moon and two slightly darker crater Circles.',
            },
            {
                title: 'Torii gate',
                text: 'Two red pillars, a curved top beam drawn with the Pen, a dark cap, a lower beam and a small centre plaque. The gate runs off the edge for depth.',
            },
            {
                title: 'Lanterns',
                text: 'Rounded Rectangles in amber with two thin rib lines, each with a soft Radial glow behind it at low opacity.',
            },
            {
                title: 'Long hair',
                text: 'One large dark Pen shape from the crown to the bottom of the page. A lighter curve near the top is the shine; two faint lines suggest strands.',
            },
            {
                title: 'Kimono and hakama',
                text: 'White kimono with red under-collar layers, two soft fold lines, and the red hakama across the bottom with pleat lines.',
            },
            {
                title: 'Face, bangs and ribbon',
                text: 'A soft face, blunt straight bangs and two side locks with red ties. A red ribbon and paper streamers sit on one side of the head.',
                trick: 'Symmetry: build one side lock, `mod+D`, flip horizontally, and use the align buttons to centre the pair.',
            },
            {
                title: 'Gentle eyes',
                text: 'Lower, softer eye shapes with violet gradient irises and a small highlight, thin eyebrows, faint under-eye lines, pink cheeks at 60% opacity and a small smile.',
            },
            {
                title: 'Charms and fireflies',
                text: 'Paper charms are tall Rectangles rotated a little, with red stripes and a seal. Fireflies are a small yellow dot with a larger 25% opacity dot around it.',
            },
        ],
        tricks: [
            'Calm pictures are symmetrical; energetic ones are tilted. Choose on purpose.',
            'Glow recipe: same colour, bigger, 25% opacity, behind.',
            'Rename layers (`F2` in the Layers panel) such as "hair back" or "hair front": it saves time on busy portraits.',
        ],
    },
    'manga-cyber-runner': {
        level: 'Intermediate',
        minutes: 40,
        intro: 'Neon colour on a dark base: everything is navy and violet except two accents, cyan and magenta, which repeat in the sign, the visor and the jacket trim.',
        steps: [
            {
                title: 'City at night',
                text: 'A dark three-stop gradient, building Rectangles in two navy tones and tiny window Rectangles in cyan and magenta at mixed opacities.',
            },
            {
                title: 'Neon signs',
                text: 'Dark Rounded Rectangles with a bright stroke and no fill, and Text in the same colour. Vertical katakana is three Text boxes stacked.',
            },
            {
                title: 'Aura and rain',
                text: 'A big magenta Radial gradient behind the head at low opacity, then one Pen path of many short diagonal strokes at 35% opacity for rain.',
                trick: 'Draw one rain stroke, `mod+D` it and move the copy; group a handful and duplicate the group to fill the sky.',
            },
            {
                title: 'Neck and tech jacket',
                text: 'A black high-collar jacket with a cyan stroke along the collar and magenta and cyan trim lines on the chest. A translucent badge rectangle adds detail.',
            },
            {
                title: 'Face and silver hair',
                text: 'The face first, then spiky hair as one path with long spikes on top and short ones over the forehead, a silver-to-lavender gradient and a thin violet outline.',
            },
            {
                title: 'Glowing visor',
                text: 'A dark wedge, a slightly smaller one on top with a cyan-blue-magenta Linear gradient, a white highlight line, and a thin cyan outline over everything.',
                trick: 'Stack the same shape three times: dark base, gradient fill, outline. It reads as a lit screen.',
            },
            {
                title: 'Nose, smirk and plaster',
                text: 'Minimal lines for nose and mouth, a cheek plaster and two blush marks. Under a visor, less detail looks cooler.',
            },
        ],
        tricks: [
            'Pick two accent colours and repeat each at least three times across the picture.',
            'Dark backgrounds make neon pop; keep them blue-black, not pure black.',
            'Use Layers opacity rather than lighter colours for rain and haze.',
        ],
    },
    'scenery-alpine': {
        level: 'Beginner',
        minutes: 30,
        intro: 'Atmospheric perspective in practice: each mountain range is darker and more saturated than the one behind it, and the lake repeats the sky.',
        steps: [
            {
                title: 'Sunrise sky',
                text: 'A three-stop Linear gradient (indigo, pink, peach), a glowing sun with a Radial halo behind it, two faint cloud wisps and two tiny birds.',
            },
            {
                title: 'Far range with snow',
                text: 'Pen one zigzag across the page in pale lilac. Snow caps are small white shapes on the highest peaks with a jagged bottom edge.',
                trick: "Turn on the grid with `mod+'` and snap with `mod+;` if you want peaks on a steady rhythm; turn snap off for a natural look.",
            },
            {
                title: 'Middle range',
                text: 'A second zigzag, lower and a step darker, with smaller snow caps.',
            },
            {
                title: 'Near hills',
                text: 'A gentle, darker band that becomes the far shore of the lake.',
            },
            {
                title: 'Lake and reflections',
                text: 'A Rectangle with a gradient that runs pink to indigo, then mirrored hill shapes at low opacity and a column of short glints under the sun.',
                trick: 'Reflection: duplicate a shape, flip it vertically from the top bar, drop its opacity to 25%.',
            },
            {
                title: 'Shore, pines and bench',
                text: 'A dark curved shore, pine trees made of three stacked Triangles each, a bench and a tuft of grass.',
            },
        ],
        tricks: [
            'Further away = lighter, less saturated, less detail.',
            'Build one pine, group it (`mod+G`), then `mod+D` and resize copies for a forest.',
            'Keep the darkest values in the foreground to frame the scene.',
        ],
    },
    'scenery-neon-city': {
        level: 'Beginner',
        minutes: 25,
        intro: 'A skyline is just rectangles. The magic is in two building layers, a few hundred pixels of lit windows and a reflection in the water.',
        steps: [
            {
                title: 'Night sky and moon',
                text: 'A navy, violet, pink Linear gradient, a few stars, a pale moon with a soft Radial glow and three crater Circles.',
            },
            {
                title: 'Back buildings',
                text: 'Lighter purple Rectangles of different heights. A thin rectangle on top of one is a spire.',
            },
            {
                title: 'Front buildings',
                text: 'Darker Rectangles that overlap the back row, one with a triangle roof and one with an antenna and a red light.',
                trick: 'Draw the front row in one colour, then select all and send it backward or forward together with `mod+↓` / `mod+↑`.',
            },
            {
                title: 'Lit windows and roof neon',
                text: 'Tiny 6 × 8 px Rectangles in warm yellow, with a few cyan and pink ones, at mixed opacity. Add a pink strip on one roof.',
            },
            {
                title: 'Harbour and reflections',
                text: 'A dark water gradient, then thin vertical bars below the brightest windows at 35% opacity, moonlight streaks and a small boat silhouette.',
            },
        ],
        tricks: [
            'Random is not random: cluster windows on a few floors and leave others dark.',
            'Reflections are shorter, dimmer copies directly below their source.',
            'Lock the sky with `mod+L` while you place hundreds of windows.',
        ],
    },
    'scenery-desert': {
        level: 'Beginner',
        minutes: 30,
        intro: 'One-point perspective: the road’s edges meet at a single point on the horizon, and the centre dashes grow as they come toward you.',
        steps: [
            {
                title: 'Dusk sky',
                text: 'A four-stop gradient from violet down through pink and orange to yellow, with a few faint stars at the top.',
            },
            {
                title: 'Low sun and clouds',
                text: 'A big Circle with a yellow-orange gradient, three stripes across it in sky colours, and two soft cloud shapes.',
            },
            {
                title: 'Mesas',
                text: 'Flat-topped Pen shapes on both sides with a lighter cap along each top edge for the lit surface.',
            },
            {
                title: 'Desert floor',
                text: 'A Rectangle with a sand gradient that darkens toward you, and two lighter wedges that suggest dunes.',
            },
            {
                title: 'Road in perspective',
                text: 'A Polygon from a narrow top at the horizon to a wide base at the bottom edge. The yellow dashes are trapezoids that get longer and wider as they come forward.',
                trick: 'Select only the road and align it to the centre: one object aligns with the page.',
            },
            {
                title: 'Saguaro cacti',
                text: 'Silhouettes in dark plum: a rounded trunk and two arms, each a single Pen path. Two rocks and two birds finish the frame.',
            },
        ],
        tricks: [
            'Silhouettes need no detail; their outline does the work.',
            'Use the darkest colour of the sky for silhouettes so they belong to the scene.',
            'Union arm and trunk shapes from the shape operations menu in the footer if you build them from pieces.',
        ],
    },
    'scenery-lighthouse': {
        level: 'Intermediate',
        minutes: 35,
        intro: 'Blue hour: everything is cool except the lighthouse lamp and one window. The beam is a gradient that fades as it travels.',
        steps: [
            {
                title: 'Twilight sky and moon',
                text: 'A gradient from deep navy to pale teal at the horizon, stars, a moon with a faint halo and two thin cloud bands.',
            },
            {
                title: 'Lighthouse beam',
                text: 'A long triangle from the lamp to the left edge with a Linear gradient from pale yellow to the sky colour, at low layer opacity.',
                trick: 'End a light gradient on the background colour and it melts into the scene.',
            },
            {
                title: 'Sea, boat and waves',
                text: 'A navy gradient sea, a pale horizon line, a tiny sailboat from three triangles, and wave strokes made with smooth Pen curves at 40% opacity.',
            },
            {
                title: 'Cliff and spray',
                text: 'A dark cliff path with two lighter facets for rock planes, and white spray strokes at its foot.',
            },
            {
                title: 'Lighthouse',
                text: 'A tapered tower, two red bands, a door, a gallery, the lit lamp room with a glow behind it and a red roof.',
            },
            {
                title: 'Keeper’s cottage and gulls',
                text: 'A small house with one warm window, and two gulls drawn as shallow double arcs.',
            },
        ],
        tricks: [
            'A single warm light in a cool scene becomes the focal point.',
            'Facets: one lighter shape on a dark rock turns a flat cliff into 3D.',
            'Use the Node tool (`A`) to smooth a wave: `alt` + click turns a corner into a curve.',
        ],
    },
    'flow-signup': {
        level: 'Beginner',
        minutes: 20,
        intro: 'A readable flow uses a shape language: pills for start and end, rectangles for actions, diamonds for decisions and red for errors. Then connectors carry the logic.',
        steps: [
            {
                title: 'Canvas and title',
                text: 'A light background, a bold title, a grey subtitle and a status badge (Text Pill) in the corner.',
            },
            {
                title: 'Main path',
                text: 'From the Shapes panel: a Text Pill for Start, Text Rounded for actions, a Text Diamond for the check. Double-click any of them to type inside.',
                trick: 'Turn on snapping (`mod+;`) so shapes on the main path share the same centre line.',
            },
            {
                title: 'Branches',
                text: 'The error box sits under the main path in red, the email check is a second diamond, then Create account and a green end pill.',
            },
            {
                title: 'Connectors',
                text: 'In the Connectors tab, use elbow connectors and drag each end onto a shape until its attach dots show. Label Yes and No with small coloured Text. Make the resend loop dashed.',
                trick: 'Attached connectors follow when you move a shape, so tidy the layout after connecting.',
            },
            {
                title: 'Sticky note',
                text: 'A Sticky Note from the Shapes panel, rotated a few degrees, for a rule the flow does not show.',
            },
        ],
        tricks: [
            'Green = start or success, red = error, amber = decision. Keep it consistent across diagrams.',
            'Use dashed lines for loops and optional paths.',
            'Read the flow aloud: every diamond needs both a Yes and a No.',
        ],
    },
    'flow-cicd': {
        level: 'Intermediate',
        minutes: 30,
        intro: 'Columns organise time: each stage of the pipeline gets a lane label, and parallel work is shown by fanning out and back in.',
        steps: [
            {
                title: 'Stage columns',
                text: 'Title and subtitle, then dashed vertical lines (footer stroke style: Dash) and small pill labels for Source, Build, Test, Gate and Release.',
            },
            {
                title: 'Source, build and tests',
                text: 'A dark "terminal" box with three coloured dots and monospace Text, a Build box, and three test boxes stacked with equal gaps. Small grey timings sit under each.',
                trick: 'Select the three test boxes and use Distribute in the top bar for perfectly even spacing.',
            },
            {
                title: 'Gate and release',
                text: 'An amber decision diamond, staging and production boxes in green (production solid for emphasis), a version tag and a red failure box.',
            },
            {
                title: 'Connectors',
                text: 'Elbow connectors fan out from Build to each test and back in to the gate. Colour the Yes path green and the No path red.',
            },
            {
                title: 'Run history card',
                text: 'A small card with ten thin bars, green for passing and red for failing runs, and the pass rate in bold.',
            },
        ],
        tricks: [
            'Lanes or columns turn a busy diagram into a timeline.',
            'Show parallel work by fanning out, not by chaining.',
            'One strong fill (the production box) is enough emphasis per diagram.',
        ],
    },
    'flow-swimlane': {
        level: 'Intermediate',
        minutes: 30,
        intro: 'Swimlanes answer "who does what": one horizontal lane per role, and every step sits in the lane of whoever owns it.',
        steps: [
            {
                title: 'Lanes',
                text: 'Three full-width Rectangles in pale tints, a darker header strip on the left of each, and lane names rotated 90° to run up each header.',
            },
            {
                title: 'Customer and warehouse steps',
                text: 'Text Rounded boxes with a stroke in the lane colour, a Text Diamond for the stock check, and an end event as a Circle with a thick stroke.',
            },
            {
                title: 'Courier steps',
                text: 'Collect and Deliver in the bottom lane, lined up under the warehouse step they follow.',
            },
            {
                title: 'Connectors across lanes',
                text: 'Elbow connectors cross lane borders where work changes hands. The "restocked" path is dashed and grey because it waits on something.',
                trick: 'A connector crossing a lane line is a hand-off: those are where delays hide.',
            },
            {
                title: 'Notes',
                text: 'A Sticky Note for an instruction and a dashed box for an exception path.',
            },
        ],
        tricks: [
            'Lock the lanes (`mod+L`) so you never drag them by accident.',
            'Lay out steps left to right in time order inside every lane.',
            'Give each lane one colour and reuse it for that lane’s box outlines.',
        ],
    },
    'design-poster': {
        level: 'Beginner',
        minutes: 20,
        intro: 'Swiss-style posters use a grid, a few bold geometric shapes and big type. Everything here is Circles, two arcs and Text.',
        steps: [
            {
                title: 'Geometric composition',
                text: 'A cream background, a large red Circle, a navy half disc and an orange quarter disc drawn with the Pen (or cut with Subtract from the shape operations menu), then a cream Circle and a dot in the centre.',
                trick: 'Quarter circle: overlap a Circle and a Square, select both, and use Intersect.',
            },
            {
                title: 'Lines and accents',
                text: 'One bold diagonal, one hairline across the top, a black dot, an outlined ring and two cream wave strokes.',
            },
            {
                title: 'Headline',
                text: 'A small overline, then JAZZ and NIGHT in a heavy font at 64 and 54 px, left-aligned on the same edge, and a thick rule under them.',
            },
            {
                title: 'Details',
                text: 'Date and time in bold, the venue smaller, the line-up in italic serif, and a red "free entry" tag balanced by the door time on the right.',
                trick: 'Use at most three type sizes and two fonts. Font Templates in the left rail gives you a ready pairing.',
            },
        ],
        tricks: [
            'Align all text to one left edge: the shared edge makes the layout feel intentional.',
            'Three colours plus black and cream is plenty for a poster.',
            'Export from the Export tab when it is done.',
        ],
    },
    'design-wireframe': {
        level: 'Beginner',
        minutes: 25,
        intro: 'A wireframe is about structure, not decoration: grey bars for text, crossed boxes for images, and one accent colour for what you can tap.',
        steps: [
            {
                title: 'Title and first screen',
                text: 'A phone frame from a Rounded Rectangle (large corner radius), an image placeholder with an X, grey bars for heading and copy, pagination dots and a primary button.',
                trick: 'Text placeholders as grey bars keep reviewers on the layout instead of the wording.',
            },
            {
                title: 'List screen',
                text: 'Duplicate the phone (`mod+D`). Build one list row (icon, two bars, checkbox), then duplicate it down. Add a round + button.',
            },
            {
                title: 'Detail screen',
                text: 'A progress ring: a grey Circle stroke with a coloured arc on top drawn with the Pen. Three stat cards and an outlined button.',
            },
            {
                title: 'Taps and notes',
                text: 'Pink hotspot circles where the user taps, dashed smooth connectors to the next screen, and a Sticky Note with an open question.',
            },
        ],
        tricks: [
            'Make one list row, group it (`mod+G`), and use linked copies (`alt+D`): restyle one and every row follows.',
            'Use a single accent colour only for interactive elements.',
            'Keep each screen on its own page (Pages panel) when the flow grows.',
        ],
    },
    'design-mindmap': {
        level: 'Beginner',
        minutes: 15,
        intro: 'A mind map grows from the centre. Colour per branch makes it scannable, and curved lines keep it organic.',
        steps: [
            {
                title: 'Centre topic and main branches',
                text: 'A dark Text Pill in the middle with the topic and a date, and four thick curved strokes drawn with the Pen, each in its own colour.',
            },
            {
                title: 'Branch nodes',
                text: 'A Text Pill at the end of each branch, tinted fill with a stroke in the branch colour.',
            },
            {
                title: 'Marketing and engineering ideas',
                text: 'Leaves are Text sitting on an underline in the branch colour, joined to the node by a thin curve.',
                trick: 'Build one leaf (curve + underline + text), group it, then `mod+D` and edit the text.',
            },
            {
                title: 'Design and support ideas',
                text: 'Same recipe for the lower branches. Keep the leaves on a few shared baselines so the map stays tidy.',
            },
        ],
        tricks: [
            'One colour per branch, used for the line, the node outline and every leaf underline.',
            'Thick lines near the centre, thin lines at the edge: hierarchy without labels.',
            'On a whiteboard (Settings > Canvas > Freehand) a mind map can keep growing in every direction.',
        ],
    },
};
