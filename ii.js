var VIDEO=null;
var SIZE=300;
var CANVAS;
var RGB_CANVAS;

var zOffset=[
	  -180,-50
	]
	
var FRAME=0;

var COLOR_KEY=[28, 79, 152, 255]

var THRESHOLD=50;

function main(){
	//removeOverlay();
	
	CANVAS=initializeCanvas("myCanvas",SIZE,SIZE);
	RGB_CANVAS=initializeCanvas("rgbCanvas",SIZE*10,SIZE*10);
	initializeCamera();
	var ctx=CANVAS.getContext("2d");
	var rgbCtx=RGB_CANVAS.getContext("2d");
	
	addEventListeners(CANVAS);
	
	setInterval(function(){
		drawScene(ctx,rgbCtx);
	},33);  // once every 100 ms
}

function addEventListeners(canvas){
	canvas.addEventListener("mousedown",onMouseDown);
}

function onMouseDown(event){
	var loc=getMouseLocation(event);
	var ctx=event.target.getContext("2d");
	COLOR_KEY=getColorAtLocation(ctx,loc);
}

function getMouseLocation(event){
	var rect=event.target.getBoundingClientRect();
	return [
		SIZE*(event.clientX-rect.left)/(rect.right-rect.left),
		SIZE*(event.clientY-rect.top)/(rect.bottom-rect.top)
	];
}

function getColorAtLocation(ctx,location){
	var data=ctx.getImageData(
				location[0],location[1],1,1).data;
	//[r,g,b,a] // 4D data point
	return data;
}

function initializeCanvas(canvasName,width,height){
	let canvas = document.getElementById(canvasName);
	canvas.width=width;
	canvas.height=height;
	return canvas;
}

function initializeCamera(){
	var promise=navigator.mediaDevices.getUserMedia({video:true});
	promise.then(function(signal){
		VIDEO=document.createElement("video");
		VIDEO.srcObject=signal;
		VIDEO.play();
	}).catch(function(err){
		alert("Camera Error");
	});
}

function drawScene(ctx, rgbCtx){
	if(VIDEO!=null){
		var min=Math.min(VIDEO.videoWidth, VIDEO.videoHeight);
		var sx=(VIDEO.videoWidth-min)/2;
		var sy=(VIDEO.videoHeight-min)/2;
		ctx.drawImage(VIDEO,sx,sy,min,min,
		                    0,0,SIZE,SIZE);
	}else{
		// show loading
	}
	
	var rgbColors=getColorsFrom(ctx,0.10);
	drawRGBColorSpace(rgbColors,rgbCtx);
	
	var locs=getLocationsOfPixelsWithColor(ctx,COLOR_KEY);
	markPixelLocations(ctx,locs);
	

	var avg=getAverageLocation(locs);
	ctx.beginPath();
	ctx.fillStyle="black";
	ctx.strokeStyle="rgb("+COLOR_KEY[0]+","+COLOR_KEY[1]+","+COLOR_KEY[2]+")";
	ctx.lineWidth=SIZE*0.01
	ctx.arc(avg[0],avg[1],SIZE*0.05,0,Math.PI*2);
	ctx.stroke();
	
	FRAME++;
	zOffset[0]+=Math.sin(FRAME/25)*4;
}

function getAverageLocation(locations){
	var avg=[0,0];
	
	for(var i=0;i<locations.length;i++){
		avg[0]+=locations[i][0];
		avg[1]+=locations[i][1];
	}
	avg[0]/=locations.length;
	avg[1]/=locations.length;
	return avg;
}

function markPixelLocations(ctx,locations){
	var imgData=ctx.getImageData(0,0,SIZE,SIZE);
	for(var i=0;i<locations.length;i++){
		var x=locations[i][0];
		var y=locations[i][1];
		imgData.data[(y*SIZE+x)*4+0]=255;
		imgData.data[(y*SIZE+x)*4+1]=0;
		imgData.data[(y*SIZE+x)*4+2]=0;
		imgData.data[(y*SIZE+x)*4+3]=255;
	}
	ctx.putImageData(imgData,0,0);
}

function getLocationsOfPixelsWithColor(ctx,color){
	var locations=[];
	var imgData=ctx.getImageData(0,0,SIZE,SIZE);
	
	for(var y=0;y<imgData.height;y++){
		for(var x=0;x<imgData.width;x++){
			var px=getPixelValue(imgData.data,x,y);
			if(euclDistance(px,color)<THRESHOLD){
				locations.push([x,y]);
			}
		}
	}
	
	return locations;
}



function drawRGBColorSpace(colors, ctx){
	ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
	
	// preparing canvas
	ctx.save();
	ctx.scale(0.7,0.7);
	ctx.translate(ctx.canvas.width*0.35,ctx.canvas.height*0.15);
	ctx.scale(ctx.canvas.width/255,-ctx.canvas.height/255);
	ctx.translate(0,-255);
	
	drawAxis(ctx,[0,255],"rgb(0,0,255)");
	drawAxis(ctx,[255,0],"red");
	drawAxis(ctx,zOffset,"rgb(0,255,0)");

	drawColorDataPoints(ctx,colors);
	drawColorKey(ctx,COLOR_KEY);
	
	ctx.restore();
	
	ctx.textAlign="right";
	ctx.textBaseline="top";
	ctx.fillStyle="black";
	ctx.beginPath();
	ctx.font=ctx.canvas.width*0.1+"px Arial";
	ctx.fillText("RGB",ctx.canvas.width,0);
}

function drawColorKey(ctx,color){
	var xySize=getXYSize(color);
	xySize.size*=3;
	ctx.strokeStyle="rgb("+color[0]+","+
		+color[1]+","+
		+color[2]+")";
		
	ctx.lineWidth=2;
	ctx.beginPath();
	ctx.rect(xySize.x-xySize.size/2,xySize.y-		xySize.size/2, xySize.size,xySize.size);
	ctx.stroke();
}

function drawColorDataPoints(ctx,colors){
	ctx.lineWidth=1;
	
	// sort data points (farthest to nearest)
	colors.sort(function(a,b){
		return a[1]-b[1];
	});

	// draw data points
	for(var i=0;i<colors.length;i++){
			
		ctx.fillStyle="rgba(0,0,0,0.1)";
		
		
		if(euclDistance(colors[i],COLOR_KEY)<
			THRESHOLD){
			ctx.fillStyle="red";
		}
		
		var xySize=getXYSize(colors[i]);
	
		ctx.beginPath();
		ctx.rect(xySize.x-xySize.size/2,xySize.y-xySize.size/2,
				 xySize.size,xySize.size);
		ctx.fill();
		
	}	
}

function drawAxis(ctx,to,color){
	ctx.strokeStyle=color;
	ctx.lineWidth=5;
	ctx.beginPath();
	ctx.moveTo(0,0);
	ctx.lineTo(to[0],to[1]);
	ctx.stroke();
}

function getXYSize(color){
	var x=color[0]; //red is index 0
	var y=color[2]; //blue is index 2
	
	x+=zOffset[0]*(color[1]/255); // green is index 1
	y+=zOffset[1]*(color[1]/255); // green is index 1
	
	var size=2+5*(color[1]/255);
	
	return {
		x:x,
		y:y,
		size:size
	}
}

function euclDistance(A,B){
	var dist=0;
	for(var i=0;i<A.length;i++){
		dist+=(A[i]-B[i])*(A[i]-B[i]);
	}
	return Math.sqrt(dist);
}

function getColorsFrom(ctx,subsampleProbability){
	var colors=[];
	/*
	[
		[r,g,b,a], // <- feature vector
		[r,g,b,a],
		[r,g,b,a],
		[r,g,b,a],
		[r,g,b,a]
	]
	// r,g,b,a are between 0 and 255
	// all alphas (a) are 255
	*/
	
	var imgData=ctx.getImageData(0,0,SIZE,SIZE);
	
	for(var y=0;y<imgData.height;y++){
		for(var x=0;x<imgData.width;x++){
			var px=getPixelValue(imgData.data,x,y);
			if(Math.random()<subsampleProbability){
				colors.push(px);
			}
		}	
	}
	
	
	return colors;
}

function getPixelValue(data,x,y){
	return[
		data[(y*SIZE+x)*4+0],
		data[(y*SIZE+x)*4+1],
		data[(y*SIZE+x)*4+2],
		data[(y*SIZE+x)*4+3],
	]
}

function removeOverlay(){
	let element = document.getElementById("overlay")
	element.style.display="none";
}
