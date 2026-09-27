/* Ink Town: Everything you can build, the town ranks, what residents need, and the task list.
   Never rename an item id: they are saved in players' towns. */
"use strict";
/* Build modes:
   single — tap a tile to place it
   line   — drag to lay a straight or L-shaped line (roads, paths, hedges)
   area   — drag a rectangle (flower beds, ponds, clearing land)
   brush  — drag your finger over tiles to scatter them (trees)
   Effects: cap = residents, jobs, serve = shoppers a shop can serve each day, appeal:[strength,radius],
   noise:[strength,radius], upkeep = cost a day, svc = the need it covers, r = how far it reaches in tiles.
   flat items are drawn on the ground. nature items are cleared for free when you build over them. */
const ITEMS=[
  // roads and paths
  {id:'road',cat:'roads',name:'Road',cost:15,mode:'line',flat:1,upkeep:.1,blurb:'Homes and businesses need a road back to the town hall.',bridge:60},
  {id:'path',cat:'roads',name:'Footpath',cost:4,mode:'line',flat:1,appeal:[1,1],blurb:'A gravel path for strolling. Makes the neighbours a little happier.',bridge:15},
  // homes
  {id:'cottage',cat:'homes',name:'Cottage',cost:300,mode:'single',cap:4,upkeep:0,blurb:'A snug home for 4 people.'},
  {id:'townhouse',cat:'homes',name:'Townhouse',cost:700,mode:'single',cap:10,rank:1,blurb:'A tall, narrow home for 10 people.'},
  {id:'apartments',cat:'homes',name:'Apartments',cost:3200,mode:'single',w:2,h:2,cap:48,rank:2,blurb:'A block of flats for 48 people.'},
  {id:'tower',cat:'homes',name:'Tower',cost:9000,mode:'single',w:2,h:2,cap:130,rank:3,blurb:'A tall tower of flats for 130 people.'},
  // shops
  {id:'shop',cat:'shops',name:'Corner shop',cost:500,mode:'single',jobs:3,serve:30,blurb:'Serves 30 shoppers. 3 jobs.'},
  {id:'cafe',cat:'shops',name:'Café',cost:900,mode:'single',jobs:4,serve:25,appeal:[3,2],rank:1,blurb:'Serves 25 and cheers up the street. 4 jobs.'},
  {id:'market',cat:'shops',name:'Market',cost:2400,mode:'single',w:2,h:2,jobs:12,serve:130,appeal:[2,3],rank:1,blurb:'Stalls under striped awnings. Serves 130. 12 jobs.'},
  {id:'arcade',cat:'shops',name:'Shopping arcade',cost:7000,mode:'single',w:2,h:2,jobs:40,serve:420,rank:3,blurb:'A glass-roofed arcade. Serves 420. 40 jobs.'},
  // work
  {id:'workshop',cat:'work',name:'Workshop',cost:600,mode:'single',jobs:6,noise:[3,2],blurb:'6 jobs. A bit noisy for close neighbours.'},
  {id:'greenhouse',cat:'work',name:'Greenhouse',cost:1600,mode:'single',w:2,h:2,jobs:10,rank:1,blurb:'10 quiet jobs growing plants.'},
  {id:'factory',cat:'work',name:'Factory',cost:3000,mode:'single',w:2,h:2,jobs:36,noise:[6,5],rank:1,blurb:'36 jobs, but loud and smoky. Keep it away from homes.'},
  {id:'office',cat:'work',name:'Office',cost:2600,mode:'single',jobs:18,rank:2,blurb:'18 quiet desk jobs.'},
  {id:'studio',cat:'work',name:'Design studio',cost:8000,mode:'single',w:2,h:2,jobs:70,rank:3,blurb:'70 quiet jobs in a glass building.'},
  // nature and gardens
  {id:'tree',cat:'nature',name:'Tree',cost:25,mode:'brush',nature:1,appeal:[2,2],blurb:'Drag to plant a row or a wood.'},
  {id:'flowers',cat:'nature',name:'Flower bed',cost:35,mode:'area',flat:1,nature:1,appeal:[2,2],blurb:'Drag out a bed of flowers.'},
  {id:'hedge',cat:'nature',name:'Hedge',cost:15,mode:'line',nature:1,appeal:[1,1],blurb:'Drag a neat hedge line.'},
  {id:'pond',cat:'nature',name:'Pond',cost:120,mode:'area',appeal:[3,2],blurb:'Dig out a pond. People love living near water.'},
  {id:'bench',cat:'nature',name:'Bench',cost:60,mode:'single',nature:1,appeal:[2,2],blurb:'Somewhere to sit and watch the town.'},
  {id:'park',cat:'nature',name:'Park',cost:900,mode:'single',w:2,h:2,appeal:[10,4],upkeep:3,blurb:'Lawns, trees and a loop path.'},
  {id:'fountain',cat:'nature',name:'Fountain',cost:600,mode:'single',appeal:[8,3],upkeep:2,rank:1,blurb:'A splashing fountain for a square.'},
  {id:'statue',cat:'nature',name:'Statue',cost:1500,mode:'single',appeal:[12,4],rank:2,blurb:'A statue of the town founder. That is you.'},
  {id:'bandstand',cat:'nature',name:'Bandstand',cost:3500,mode:'single',w:2,h:2,appeal:[18,5],upkeep:6,rank:3,blurb:'Brass bands on Sundays.'},
  // services
  {id:'hall',cat:'services',name:'Town hall',cost:0,mode:'single',w:2,h:2,upkeep:10,hidden:1,blurb:'Where the town is run. Every road must lead back here.'},
  {id:'clinic',cat:'services',name:'Clinic',cost:1800,mode:'single',upkeep:22,svc:'health',r:7,blurb:'Doctors for everyone within 7 tiles.'},
  {id:'school',cat:'services',name:'School',cost:2600,mode:'single',w:2,h:2,upkeep:28,svc:'school',r:8,rank:1,blurb:'Lessons for every child within 8 tiles.'},
  {id:'fire',cat:'services',name:'Fire station',cost:1500,mode:'single',upkeep:18,svc:'fire',r:8,rank:1,blurb:'Keeps homes within 8 tiles safe.'},
  {id:'library',cat:'services',name:'Library',cost:1400,mode:'single',upkeep:12,svc:'books',r:7,rank:2,blurb:'Books for everyone within 7 tiles.'},
  {id:'police',cat:'services',name:'Police post',cost:1700,mode:'single',upkeep:18,svc:'police',r:8,rank:2,blurb:'Keeps streets within 8 tiles calm.'},
  // clearing
  {id:'clear',cat:'clear',name:'Clear',cost:0,mode:'area',tool:1,blurb:'Drag over anything to knock it down. You get half its price back.'},
];
const IT={}; ITEMS.forEach(d=>{ d.w=d.w||1; d.h=d.h||1; d.rank=d.rank||0; d.upkeep=d.upkeep||0; IT[d.id]=d; });
// the wild trees that grow on the map from the start (clearing one costs a little)
IT.wild={id:'wild',cat:'nature',name:'Wild tree',cost:0,w:1,h:1,nature:1,appeal:[1,2],clearCost:5,rank:0,upkeep:0,blurb:'An old tree that was here before the town.'};

const CATS=[
  {id:'roads',name:'Roads'},{id:'homes',name:'Homes'},{id:'shops',name:'Shops'},{id:'work',name:'Work'},
  {id:'nature',name:'Gardens'},{id:'services',name:'Services'},{id:'clear',name:'Clear'}];

// Town ranks: reaching a population unlocks new buildings and pays a grant from the county.
const RANKS=[
  {name:'Hamlet',pop:0,grant:0},
  {name:'Village',pop:60,grant:2500},
  {name:'Town',pop:220,grant:6000},
  {name:'Borough',pop:600,grant:12000},
  {name:'City',pop:1500,grant:30000}];

// What residents come to expect as the town grows. Covered: a happiness bonus. Needed but missing: a penalty.
const NEEDS=[
  {svc:'health',name:'a clinic',at:40,bonus:7,miss:9},
  {svc:'school',name:'a school',at:100,bonus:8,miss:10},
  {svc:'fire',name:'a fire station',at:160,bonus:6,miss:8},
  {svc:'books',name:'a library',at:280,bonus:5,miss:5},
  {svc:'police',name:'a police post',at:420,bonus:6,miss:8}];

const TAX={low:{name:'Low',mul:.75,hap:6},fair:{name:'Fair',mul:1,hap:0},high:{name:'High',mul:1.35,hap:-9}};
// one loan at a time: the bank pays out now and takes a little back each day
const LOAN={amount:10000,days:100,perDay:115};

/* Tasks guide a new mayor, one at a time, with a small reward each. `done(st)` reads the town's live stats. */
const TASKS=[
  {id:'road',text:'Lay 6 road tiles from the town hall',goal:6,val:s=>Math.max(0,s.roadsConn-2),pay:300},
  {id:'homes',text:'Build 3 cottages beside the road',goal:3,val:s=>s.n.cottage||0,pay:400},
  {id:'shop',text:'Open a corner shop',goal:1,val:s=>s.n.shop||0,pay:300},
  {id:'work',text:'Build a workshop for jobs',goal:1,val:s=>s.n.workshop||0,pay:300},
  {id:'trees',text:'Plant 6 trees',goal:6,val:s=>s.n.tree||0,pay:200},
  {id:'pop30',text:'Welcome 30 residents',goal:30,val:s=>s.pop,pay:600},
  {id:'park',text:'Build a park',goal:1,val:s=>s.n.park||0,pay:600},
  {id:'clinic',text:'Open a clinic',goal:1,val:s=>s.n.clinic||0,pay:800},
  {id:'village',text:'Grow into a village (60 people)',goal:60,val:s=>s.pop,pay:500},
  {id:'bridge',text:'Build a bridge over the river',goal:1,val:s=>s.bridges,pay:800},
  {id:'school',text:'Open a school',goal:1,val:s=>s.n.school||0,pay:1200},
  {id:'happy',text:'Keep 100 people 70% happy',goal:1,val:s=>s.pop>=100&&s.hap>=70?1:0,pay:1500},
  {id:'town',text:'Grow into a town (220 people)',goal:220,val:s=>s.pop,pay:1500},
  {id:'green',text:'Have 60 trees and flower beds',goal:60,val:s=>(s.n.tree||0)+(s.n.flowers||0),pay:1500},
  {id:'rich',text:'Earn $1,000 in a single day',goal:1,val:s=>s.net>=1000?1:0,pay:3000},
  {id:'borough',text:'Grow into a borough (600 people)',goal:600,val:s=>s.pop,pay:4000},
  {id:'city',text:'Grow into a city (1,500 people)',goal:1500,val:s=>s.pop,pay:10000}];

const TOWN_NAMES=['Inkwell','Quillby','Nibsworth','Blotwick','Penhollow','Sketchley','Scribbleford','Doodlecombe','Crosshatch','Papermoor','Linton Nib','Little Stipple','Margin-on-Sea','Fountain Bridge'];
