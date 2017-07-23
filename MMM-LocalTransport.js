/* global Module */
/* Magic Mirror
 * Module: MMM-LocalTransport
 *
 * By Christopher Fenner https://github.com/CFenner
 * style options by Lasse Wollatz
 * MIT Licensed.
 */
Module.register('MMM-LocalTransport', {
  defaults: {
    maximumEntries: 5,
    displayStationLength: 0,
    displayWalkType: 'none',
    displayArrival: true,
    maxWalkTime: 10,
    fade: true,
    fadePoint: 0.1,
    showColor: true,
    maxModuleWidth: 0,
    animationSpeed: 1,
    updateInterval: 1,
    language: config.language,
    units: config.units,
    timeFormat: config.timeFormat,
    mode: 'transit',
    traffic_model: 'best_guess',
    departure_time: 'now',
    alternatives: true,
	apiBase: 'http://192.168.1.234/luas_times.php',
	/*
	apiBase: 'https://maps.googleapis.com/',
    apiEndpoint: 'maps/api/directions/json',
	*/
    debug: false
  },
  start: function() {
    Log.info('Starting module: ' + this.name);
    this.loaded = false;
    //this.url = this.config.apiBase + this.config.apiEndpoint + this.getParams();
	this.url = this.config.apiBase;
    var d = new Date();
    this.lastupdate = d.getTime() - 2 * this.config.updateInterval * 60 * 1000;
    this.update();
    // refresh every 10 seconds
    setInterval(
        this.update.bind(this),
        10 * 1000);
  },
  update: function() {
    //updateDOM
    var dn = new Date();
    if (dn.getTime() - this.lastupdate >= this.config.updateInterval * 60 * 1000){
        //perform main update
        //request routes from LUAS Forecasts
        this.sendSocketNotification(
            'LOCAL_TRANSPORT_REQUEST', {
                id: this.identifier,
				url: this.config.apiBase
            }
        );
        if (this.config.debug){
          this.sendNotification("SHOW_ALERT", { timer: 3000, title: "LOCAL TRANSPORT", message: "special update"});
        }
        this.lastupdate = dn.getTime();
		this.luasdata = dn.getTime();
    }else{
        //perform minor update
        //only update time
        if (this.config.debug){
          this.sendNotification("SHOW_ALERT", {timer: 3000, title: "LOCAL TRANSPORT", message: "normal update"});
        }
        this.loaded = true;
        this.updateDom(); //this.updateDom(this.config.animationSpeed * 1000)
    }
  },
  getParams: function() {
    var params = '?';
    params += 'mode=' + this.config.mode;
    params += '&origin=' + this.config.origin;
    params += '&destination=' + this.config.destination;
    params += '&key=' + this.config.api_key;
    params += '&traffic_model=' + this.config.traffic_model;
    params += '&departure_time=now';
    params += '&alternatives=true';
    return params;
  },
  renderLeg: function(wrapper, leg){
    /* renderLeg
     * creates HTML element for one leg of a route
     */
    var depature = leg.unix * 1000;
    var arrival = leg.arrival * 1000;
	//var depadd = leg.start_address;
    var span = document.createElement("div");
    span.className = "small bright";
	//console.log("DEPARTURE: " + moment(depature).locale(this.config.language).fromNow());
	var str = moment(depature).locale(this.config.language).fromNow();
	
	var myRegexp = /in (\d+) minute/i;
	var match = myRegexp.exec(str);
	if(match)
	{
		//console.log(match[1]); // abc
		if(match[1] < 6) {
			//console.log("Less than 5");
			span.className = "small red";
		}
		else
		{
			//console.log("Greater than 5");
			span.className = "small bright";
		}
	}
	else
	{
		// Check for seconds!!
		n = str.search(/second|minute/i);
		//var match = myRegexp.exec(str);
		//console.log("n:" + n);
		if (n > 0) {
			span.className = "small red";
		}
		else
		{
			span.className = "small bright";
		}
	}
	
    span.innerHTML = "departs " + moment(depature).locale(this.config.language).fromNow();
    // span.innerHTML += "from " + depadd;
    if (this.config.displayArrival && this.config.timeFormat === 24){
        span.innerHTML += " ("+this.translate("ARRIVAL")+": " + moment(arrival).format("H:mm") + ")";
    }else if(this.config.displayArrival){
        span.innerHTML += " ("+this.translate("ARRIVAL")+": " + moment(arrival).format("h:mm") + ")";
    }
    wrapper.appendChild(span);
  },
  
  renderStep: function(wrapper, step){
    /* renderStep
     * creates HTML element for one step of a leg
     */
	var details = step;
	if(details) {
		/*add symbol of transport vehicle*/
		//var img = document.createElement("img");
		//if(this.config.showColor){
		//	img.className = "symbol";
		//}else{
		//	img.className = "symbol bw";
		//}
		/* get symbol online*/
		//img.src = details.line.vehicle.local_icon || ("http:" + details.line.vehicle.icon);
		/* can provide own symbols under /localtransport/public/*.png */
		//img.src = "config/luas.png";
		//img.alt = "[LUAS]";
		//wrapper.appendChild(img);
		/*add description*/
		var span = document.createElement("span");
		/* add line name*/
		span.innerHTML = "Tram: " + details.Tram || details.station;
		if (this.config.displayStationLength > 0){
			/* add departure stop (shortened)*/
			span.innerHTML += " ("+this.translate("TO")+" " + this.shorten(details.Destination, this.config.displayStationLength) + ")";
		}else if (this.config.displayStationLength === 0){
			/* add departure stop*/
			span.innerHTML += " ("+this.translate("TO")+" " + details.Destination + ")";
		}
		if (this.config.debug){
			/* add vehicle type for debug*/
			span.innerHTML += " [" + details.Tram +"]";
		}
		span.className = "xsmall dimmed";
		wrapper.appendChild(span);
    }
  },
  socketNotificationReceived: function(notification, payload) {
	  //Log.info('Payload:' + payload.data);
    if (notification === 'LOCAL_TRANSPORT_RESPONSE' && payload.id === this.identifier) {
        if(payload.data && payload.data.status === "OK"){
            this.info = payload.data;
            this.loaded = true;
            this.updateDom(this.config.animationSpeed * 1000);
        }
    }
  },
  getStyles: function() {
    return ["localtransport.css"];
  },
  getScripts: function() {
        return ["moment.js"];
  },
  getTranslations: function() {
    return {
        de: "i18n/de.json",
        en: "i18n/en.json",
        sv: "i18n/sv.json"
    };
  },
  getDom: function() {
    /* main function creating HTML code to display*/
    var wrapper = document.createElement("div");
    if (!this.loaded) {
        /*if not loaded, display message*/
        wrapper.innerHTML = this.translate("LOADING_CONNECTIONS");
        wrapper.className = "small dimmed";
    }else{
		var dn = new Date();
        /*create an unsorted list with each
         *route alternative being a new list item*/
        var udt = document.createElement("div");
        //udt.innerHTML = moment(this.luasdata).fromNow().format("HH:mm:ss") + " (" +  this.luasdata + ")";
		udt.innerHTML = " GLENCAIRN LUAS - Info updated " + moment.utc(moment(dn).diff(moment(this.luasdata))).format("mm:ss") + "<br>" + this.shorten(this.info.LUAS_Status, 75);
		udt.className = "xsmall dimmed bold";
		udt.style.borderBottomStyle="solid";
		udt.style.borderWidth = "thin";
        wrapper.appendChild(udt);
		
        var ul = document.createElement("ul");
        var Nrs = 0; //number of routes
        var routeArray = []; //array of all alternatives for later sorting
		//Log.info(this.info);
		
		for(var routeKey in this.info.trams) {
            var route = this.info.trams[routeKey];
			//Log.info('Get time: ' + dn.getTime()/1000);
			if (route.unix < (dn.getTime()/1000)) {
				//Log.info("Skip");
				continue;
			}
						
            var li = document.createElement("li");
            li.className = "small";
            var arrival = 0;
            if (this.config.maxModuleWidth > 0){
              li.style.width = this.config.maxModuleWidth + "px";
            }
			arrival = route.unix;
			var tmpwrapper = document.createElement("text");
			this.renderStep(tmpwrapper, route);
			this.renderLeg(li, route);
            li.appendChild(tmpwrapper);
            routeArray.push({"arrival":arrival,"html":li});
            Nrs += 1;
        }

        /*sort the different alternative routes by arrival time*/
        //routeArray.sort(function(a, b) {
        //    return parseFloat(a.arrival) - parseFloat(b.arrival);
        //});
        /*only show the first few options as specified by "maximumEntries"*/
        //routeArray = routeArray.slice(0, this.config.maximumEntries);

        /*create fade effect and append list items to the list*/
        var e = 0;
        Nrs = routeArray.length;
        for(var dataKey in routeArray) {
            var routeData = routeArray[dataKey];
            var routeHtml = routeData.html;
            // Create fade effect.
            if (this.config.fade && this.config.fadePoint < 1) {
                if (this.config.fadePoint < 0) {
                    this.config.fadePoint = 0;
                }
                var startingPoint = Nrs * this.config.fadePoint;
                var steps = Nrs - startingPoint;
                if (e >= startingPoint) {
                    var currentStep = e - startingPoint;
                    //routeHtml.style.opacity = 1 - (1 / steps * currentStep);
                }
            }
            ul.appendChild(routeHtml);
            e += 1;
        }
        wrapper.appendChild(ul);
    }
    return wrapper;
  },
  shorten: function(string, maxLength) {
    /*shorten
     *shortens a string to the number of characters specified*/
    if (string.length > maxLength) {
        return string.slice(0,maxLength) + "&hellip;";
    }
    return string;
  }

});
