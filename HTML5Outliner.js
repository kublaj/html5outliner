// Section class
function Section() {
	this.parentSection = null;
	this.childSections = new Array();
	this.firstChild = null;
	this.lastChild = null;
	this.appendChild = function(section) {
		section.parentSection = this;
		this.childSections.push(section);
		if(this.firstChild === null) this.firstChild = section;
		this.lastChild = section;
	};

	this.heading = null; // heading element associated with the section, if any

	this.associatedNodes = new Array(); // DOM nodes associated with the section
	this.associatedElements = new Array();
}

// Main function
function HTMLOutline(root, modifyDOM) {
	if(root === undefined) root = document.body;
	
	if(!modifyDOM) root = root.cloneNode(true);
	
	// BEGIN OUTLINE ALGORITHM
	// STEP 1
	var currentOutlinee = null; // element whose outline is being created
	// STEP 2
	var currentSection = null; // current section
	
	// STEP 3
	// Minimal stack object
	var stack = {"lastIndex": -1, "isEmpty": true};
	stack.push = function(e) {
		stack[++stack.lastIndex] = e;
		stack.top = e;
		stack.isEmpty = false;
	};
	stack.pop = function() {
		var e = stack.top;
		delete stack[stack.lastIndex--];
		if(stack.lastIndex === -1) stack.isEmpty = true;
		else stack.top = stack[stack.lastIndex];
		return e;
	};
	
	// STEP 4 (minus DOM walk which is at the end)
	// The following functions implement word for word the substeps of step 4
	function enter(node) {
		if(isElement(node)) {
			if(!stack.isEmpty && isHeadingElement(stack.top)) {
				// Do nothing
			} else if(isSectioningContentElement(node) || isSectioningRootElement(node)) {
				if(currentOutlinee !== null && !currentSection.heading) {
					// Algorithm says to "create implied heading" here,
					// which is pointless in this implementation
				}
				if(currentOutlinee !== null) stack.push(currentOutlinee);
				currentOutlinee = node;
				currentSection = new Section();
				associateNodeWithSection(currentOutlinee, currentSection);
				currentOutlinee.appendSection(currentSection);
			} else if(currentOutlinee === null) {
				// Do nothing
			} else if(isHeadingElement(node)) {
				if(currentSection.heading === null) currentSection.heading = node;
				else if(node.rank >= currentOutlinee.lastSection.heading.rank) {
					var newSection = new Section();
					currentOutlinee.appendSection(newSection);
					currentSection = newSection;
					currentSection.heading = node;
				} else {
					var candidateSection = currentSection;
					do {
						if(node.rank < candidateSection.heading.rank) {
							var newSection = new Section();
							candidateSection.appendChild(newSection);
							currentSection = newSection;
							currentSection.heading = node;
							break;
						}
						var newCandidate = candidateSection.parentSection;
						candidateSection = newCandidate;
					} while(true);
				}
				stack.push(node);
			} else {
				// Do nothing
			}
		}
	}
	
	function exit(node) {
		if(isElement(node)) {
			if(!stack.isEmpty && node === stack.top) stack.pop();
			else if(!stack.isEmpty && isHeadingElement(stack.top)) {
				// Do nothing
			} else if(!stack.isEmpty && isSectioningContentElement(node)) {
				currentOutlinee = stack.pop();
				currentSection = currentOutlinee.lastSection;
				for(var i = 0; i < node.sectionList.length; i++) {
					currentSection.appendChild(node.sectionList[i]);
				}
			} else if(!stack.isEmpty && isSectioningRootElement(node)) {
				currentOutlinee = stack.pop();
				currentSection = currentOutlinee.lastSection;
				while(currentSection.childSections.length > 0) {
					currentSection = currentSection.lastChild;
				}
			} else if(isSectioningContentElement(node) || isSectioningRootElement(node)) {
				currentSection = currentOutlinee.firstSection;
				endWalk(); // Jump to step 5
			} else if(currentOutlinee === null) {
				// Do nothing
			} else {
				// Do nothing
			}
		}
		if(node.associatedSection === null && currentSection !== null) associateNodeWithSection(node, currentSection);
	}
	
	function endWalk() {
		// STEP 5
		// According to the algorithm, we should check if currentOutlinee is null,
		// but this can't actually happen since root is a sectioning element
		// STEP 6
		enter = function(node) {associateNodeWithSection(node, currentOutlinee.firstSection);};
		exit = function(node) {};
		// STEP 7
		// The heading associated to node is node.associatedSection.heading, if any
		// STEP 8
		// Nothing to do
		// END OUTLINE ALGORITHM
	}
	
	// Now we must make the necessary definitions for the above to make sense...
	function associateNodeWithSection(node, section) {
		section.associatedNodes.push(node);
		if(isElement(node)) section.associatedElements.push(node);
		node.associatedSection = section;
	}
	
	function isElement(node) {
		return node.nodeType === node.ELEMENT_NODE;
	}
	
	function isSectioningContentElement(node) {
		return node.sectionType === node.SECTION_CONTENT;
	}
	
	function isSectioningRootElement(node) {
		return node.sectionType === node.SECTION_ROOT;
	}
	
	function isHeadingElement(node) {
		return node.sectionType === node.SECTION_HEADING;
	}
	
	function extend(node) {
		if(node.nodeType === 1) {
			switch(node.nodeName.toLowerCase()) {
				case "blockquote": case "body": case "details": case "fieldset": case "figure": case "td":
					extendSectioningRootElement(node);
					break;
				case "article": case "aside": case "nav": case "section":
					extendSectioningContentElement(node);
					break;
				case "hgroup":
					extendHeadingGroupElement(node);
					break;
				case "h1": case "h2": case "h3": case "h4": case "h5": case "h6": case "hgroup":
					extendHeadingTitleElement(node);
					break;
				default:
					extendElement(node);
			}
		} else extendNode(node);
	}
	
	function extendNode(node) {
		node.associatedSection = null;
		
		// Sectioning type constants
		node.SECTION_ROOT = 1;
		node.SECTION_CONTENT = 2;
		node.SECTION_HEADING = 3;
	}
	
	function extendElement(node) {
		extendNode(node);
	}
	
	function extendSectioningElement(node) {
		extendElement(node);
		node.sectionList = new Array();
		node.firstSection = null;
		node.lastSection = null;
		
		node.appendSection = function(section) {
			this.sectionList.push(section);
			if(this.firstSection === null) this.firstSection = section;
			this.lastSection = section;
		};
	}
	
	function extendSectioningContentElement(node) {
		extendSectioningElement(node);
		node.sectionType = node.SECTION_CONTENT;
	}
	
	function extendSectioningRootElement(node) {
		extendSectioningElement(node);
		node.sectionType = node.SECTION_ROOT;
	}
	
	function extendHeadingElement(node) {
		extendElement(node);
		node.sectionType = node.SECTION_HEADING;
	}
	
	function extendHeadingTitleElement(node) {
		extendHeadingElement(node);
		node.rank = -parseInt(node.nodeName.charAt(1));
		node.text = node.textContent;
	}
	
	function extendHeadingGroupElement(node) {
		extendHeadingElement(node);

		for(var i = 1; i <= 6; i++) {
			var h = node.getElementsByTagName("h" + i);
			if(h.length > 0) {
				node.rank = -i;
				node.text = h[0].textContent;
				break;
			}
		}
		
		if(node.rank === undefined) {
			node.rank = -1;
			node.text = "";
		}
	}
	
	try {
		extend(root);
		if(!isSectioningContentElement(root) && !isSectioningRootElement(root)) {
			throw new Error(root.toString() + " is not a sectioning content element or a sectioning root element.");
		}
		// Walk the DOM subtree of root
		enter(root);
		var node = root.firstChild;
		start: while(node) {
			extend(node);
			enter(node);
			if(node.firstChild) {
				node = node.firstChild;
				continue start;
			}
			while(node) {
				if(node === root) break start;
				exit(node);
				if(node.nextSibling) {
					node = node.nextSibling;
					continue start;
				}
				node = node.parentNode;
			}
		}
		exit(root);
	} catch(error) {
		return error;
	}
	return root.sectionList;
}

